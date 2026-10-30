// 环境规划评测：对 eval/plan-cases.mjs 中的项目资料，分别运行“只用规则”与“规则 + 本机开源模型”，与人工标注比较。
// 资料从 GitHub 现取并缓存在 .cache/plan-eval（不提交）；模型组调用评测者自己的 API（按服务商计费），不连接 AutoDL。
// 用法：node scripts/eval-plan.mjs [--rules-only] [--model 模型ID] [--only id1,id2] [--refetch] [--out 文件名] [--rescore 已有结果文件]
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { CASES } from '../eval/plan-cases.mjs';
import { extractConstraints, mergeConstraints, planGpus, parseSpec, satisfies, formatSpec } from '../src/env-plan.mjs';
import { AiAssistant, AI_PROVIDERS } from '../src/ai.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), flag = name => args.includes(name), value = name => args[args.indexOf(name) + 1];
const rulesOnly = flag('--rules-only'), only = flag('--only') ? value('--only').split(',') : null;
const cacheDir = path.join(root, '.cache', 'plan-eval'), outDir = path.join(root, 'eval');
fs.mkdirSync(cacheDir, { recursive: true });

async function fetchFile(repo, file) {
  const cached = path.join(cacheDir, (repo + '/' + file).replace(/[\\/]/g, '_'));
  if (fs.existsSync(cached) && !flag('--refetch')) return { text: fs.readFileSync(cached, 'utf8'), fetchedAt: fs.statSync(cached).mtime.toISOString() };
  const response = await fetch('https://raw.githubusercontent.com/' + repo + '/HEAD/' + file, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw Error(repo + '/' + file + ' HTTP ' + response.status);
  const text = await response.text(); fs.writeFileSync(cached, text);
  return { text, fetchedAt: new Date().toISOString() };
}
function excerpt(text, f) {
  if (f.whole) return text.trim();
  const lines = text.split('\n'), at = lines.findIndex(line => f.anchor.test(line));
  if (at < 0) throw Error('资料已变化，找不到截取位置 ' + f.anchor);
  return lines.slice(Math.max(0, at - f.before), at + f.after + 1).join('\n').trim();
}
async function material(c) {
  if (c.synthetic) return { text: c.text, sources: [{ synthetic: true, chars: c.text.length }] };
  const parts = [], sources = [];
  for (const f of c.files) {
    const { text, fetchedAt } = await fetchFile(f.repo, f.path), cut = excerpt(text, f);
    parts.push('文件：' + f.repo + '/' + f.path + '\n' + cut);
    sources.push({ url: 'https://github.com/' + f.repo + '/blob/HEAD/' + f.path, sha256: createHash('sha256').update(text).digest('hex').slice(0, 16), fetchedAt, chars: cut.length });
  }
  return { text: parts.join('\n\n'), sources };
}
// ---- 评分 ----
const GRID = {
  torch: ['1.7', '1.8', '1.9', '1.10', '1.11', '1.12', '1.13', '2.0', '2.1', '2.2', '2.3', '2.4', '2.5', '2.6', '2.7', '2.8', '2.9'].flatMap(v => [0, 1, 2, 3].map(p => v + '.' + p)),
  python: ['3.6', '3.7', '3.8', '3.9', '3.10', '3.11', '3.12', '3.13'].flatMap(v => [0, 5, 12].map(p => v + '.' + p)),
  cuda: ['10.2', '11.0', '11.1', '11.3', '11.4', '11.6', '11.7', '11.8', '12.1', '12.4', '12.6', '12.8', '13.0'],
};
function scoreVersion(field, expected, got) {
  if (got?.ambiguous) return 'ambiguous';
  if (!expected) return got ? 'spurious' : 'correct';
  if (!got) return 'missed';
  const want = GRID[field].filter(v => satisfies(v, parseSpec(expected))), have = GRID[field].filter(v => satisfies(v, got.spec));
  if (want.length === have.length && want.every(v => have.includes(v))) return 'correct';
  return have.length && have.every(v => want.includes(v)) ? 'stricter' : 'wrong';
}
function scoreVram(expected, got) {
  if (got?.ambiguous) return 'ambiguous';
  if (expected === null) return got ? 'spurious' : 'correct';
  if (!got) return 'missed';
  return Math.abs(got.value - expected) <= 0.5 ? 'correct' : 'wrong';
}
const show = (field, f) => !f ? '—' : f.ambiguous ? '多个候选' + (f.candidates ? '（' + f.candidates.join('、') + '）' : '') : field === 'vramGB' ? String(f.value) : formatSpec(f.spec);
// 判定层：用 AutoDL 创建页实际出现的型号名，比较“按标注”与“按读出的条件”对每个型号的结论（不比较特性，标注不含特性）。
const NAMES = ['RTX 5090', 'RTX PRO 6000', 'A800-80GB-NVLink', 'RTX 4090D', 'RTX 4090', 'RTX 3080 Ti', 'H800', 'RTX 3090', 'RTX 3060', 'RTX A4000',
  'GTX 1080 Ti', 'H20-NVLink', 'V100-SXM2-32GB', 'RTX 2080 Ti', 'A100-PCIE-40GB', 'Tesla T4', 'TITAN Xp'];
const CATALOG = { checkedAt: 1, regions: [{ region: '评测', models: NAMES.map(model => ({ model, available: 1, total: 1 })) }] };
function truthConstraints(e) {
  const v = s => s ? { spec: parseSpec(s), source: 'label' } : null;
  return { framework: null, torch: v(e.torch), python: v(e.python), cuda: v(e.cuda), vramGB: e.vramGB === null ? null : { value: e.vramGB }, gpuCount: null, features: [], archList: null };
}
function decisions(truth, got) {
  const verdict = c => Object.fromEntries(planGpus(CATALOG, { ...c, features: [] }).map(g => [g.model, g.status]));
  const a = verdict(truth), b = verdict(got), allowed = s => s === 'ok' || s === 'warn'; // 需核对（含显存要求未知）不算放行
  return { unsafe: NAMES.filter(n => !allowed(a[n]) && allowed(b[n])), overExcluded: NAMES.filter(n => allowed(a[n]) && !allowed(b[n])) };
}
function grade(c, got) {
  const fields = { torch: scoreVersion('torch', c.expected.torch, got.torch), python: scoreVersion('python', c.expected.python, got.python),
    cuda: scoreVersion('cuda', c.expected.cuda, got.cuda), vramGB: scoreVram(c.expected.vramGB, got.vramGB) };
  return { fields, values: Object.fromEntries(Object.keys(fields).map(k => [k, show(k, got[k])])), ...decisions(truthConstraints(c.expected), got) };
}
// ---- 运行 ----
// 模型组使用评测者自己的 API Key（只从环境变量读取，不写入结果文件）：
//   AI_EVAL_API_KEY（必填）、AI_EVAL_PROVIDER（deepseek / dashscope / custom，默认 deepseek）、AI_EVAL_MODEL、AI_EVAL_BASE_URL（按需）
let modelInfo = null;
const ai = new AiAssistant({ data: {}, save() {} });
if (!rulesOnly && !flag('--rescore')) {
  const key = String(process.env.AI_EVAL_API_KEY || '').trim(), provider = process.env.AI_EVAL_PROVIDER || 'deepseek';
  if (!key) { console.error('模型组需要你自己的 API Key：设置环境变量 AI_EVAL_API_KEY 后重试；只评测规则请加 --rules-only。'); process.exit(1); }
  const preset = AI_PROVIDERS.find(p => p.id === provider);
  if (!preset) { console.error('AI_EVAL_PROVIDER 只能是 ' + AI_PROVIDERS.map(p => p.id).join(' / ')); process.exit(1); }
  try {
    ai.saveSettings({ enabled: true, provider, baseUrl: process.env.AI_EVAL_BASE_URL || preset.baseUrl, model: flag('--model') ? value('--model') : process.env.AI_EVAL_MODEL || preset.model,
      timeoutSeconds: 120, maxTokens: 1024, rememberKey: false, apiKey: key });
  } catch (error) { console.error('模型设置无效：' + error.message); process.exit(1); }
  const s = ai.publicState();
  modelInfo = { provider: s.provider, model: s.model, baseUrl: s.baseUrl };
}
const results = [];
// --rescore 文件名：不调用模型，用该结果文件中保存的模型输出（已通过引用核对的条目）按当前规则与判定代码重新评分。
const rescore = flag('--rescore') ? JSON.parse(fs.readFileSync(path.join(outDir, path.basename(value('--rescore'))), 'utf8')) : null;
for (const c of CASES.filter(c => !only || only.includes(c.id))) {
  const { text, sources } = await material(c), input = c.request + '\n' + text;
  const rules = extractConstraints(input, { request: c.request }), row = { id: c.id, synthetic: !!c.synthetic, request: c.request, expected: c.expected, basis: c.basis, sources, rules: grade(c, rules) };
  const stored = rescore?.results.find(r => r.id === c.id)?.model;
  if (stored && !stored.error) row.model = { ...stored, ...grade(c, mergeConstraints(rules, stored.accepted || [])) };
  else if (stored) row.model = stored;
  else if (!rulesOnly && !rescore) {
    try {
      const out = await ai.extract({ request: c.request, projectText: text });
      row.model = { ...grade(c, mergeConstraints(rules, out.accepted)), accepted: out.accepted, rejected: out.rejected, elapsedMs: out.meta.elapsedMs, usage: out.meta.usage };
    } catch (error) { row.model = { error: error.code + ' ' + error.message }; }
  }
  results.push(row);
  console.log(c.id.padEnd(20), 'rules', JSON.stringify(row.rules.fields), row.model ? 'model ' + JSON.stringify(row.model.fields || row.model.error) + ' ' + ((row.model.elapsedMs || 0) / 1000).toFixed(0) + 's' : '');
}
ai.close();
// ---- 汇总 ----
function summary(key) {
  const rows = results.filter(r => r[key] && !r[key].error), out = { cases: rows.length, errors: results.filter(r => r[key]?.error).length };
  for (const field of ['torch', 'python', 'cuda', 'vramGB']) {
    const counts = {}, labeled = rows.filter(r => r.expected[field] !== null);
    for (const r of rows) counts[r[key].fields[field]] = (counts[r[key].fields[field]] || 0) + 1;
    // 只看标注了具体值的字段（排除“资料没写、读出也没写”这种容易的情况）
    out[field] = { ...counts, labeled: labeled.length, labeledCorrect: labeled.filter(r => r[key].fields[field] === 'correct').length,
      nullSpurious: rows.filter(r => r.expected[field] === null && r[key].fields[field] === 'spurious').length };
  }
  out.unsafe = rows.reduce((n, r) => n + r[key].unsafe.length, 0); out.overExcluded = rows.reduce((n, r) => n + r[key].overExcluded.length, 0);
  out.casesWithUnsafe = rows.filter(r => r[key].unsafe.length).map(r => r.id);
  return out;
}
const tokens = results.map(r => r.model?.usage?.total_tokens).filter(Number.isFinite);
const report = { generatedAt: new Date().toISOString(), node: process.version, model: rescore ? rescore.model ?? rescore.ollama ?? null : modelInfo,
  ...(rescore ? { rescoredFrom: path.basename(value('--rescore')), originalGeneratedAt: rescore.originalGeneratedAt || rescore.generatedAt } : {}), totalTokens: tokens.length ? tokens.reduce((a, b) => a + b, 0) : null, gpuNames: NAMES, summary: { rules: summary('rules'), ...(rulesOnly && !rescore ? {} : { model: summary('model') }) }, results };
const outName = flag('--out') ? value('--out') : rulesOnly ? 'plan-results-rules.json' : 'plan-results.json';
fs.writeFileSync(path.join(outDir, path.basename(outName)), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report.summary, null, 1));
