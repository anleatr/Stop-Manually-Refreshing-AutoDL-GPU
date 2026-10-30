# AI 环境与选卡（可选）

更新日期：2026-10-30（Asia/Shanghai）。

## 有无模型的区别

| 能力 | 不启用模型 | 启用模型（自己的 API Key） |
| --- | --- | --- |
| GPU 监测、新建、同地区克隆与数据盘复制、通知 | 可用 | 可用，模型不参与 |
| 环境与选卡规划：从资料读出版本、显存、特性，判断各型号能否用，填入新建任务 | 可用（规则） | 可用，模型补充规则读不出的约束 |
| 项目环境分析、错误日志诊断（文字建议） | 停用 | 用户主动提交时调用模型 |

模型使用用户自己的云端 API Key：DeepSeek、阿里云百炼，或其他 Chat Completions 兼容接口。推理在服务商那里完成，使用者的电脑不需要 GPU，也不需要安装模型。调用按服务商规则计费。本工具不在 AutoDL 上部署模型。

2026-10-30 起不再提供本机 Ollama 选项：不是每位用户都装有 Ollama。开发期间曾用本机 Qwen3-4B 做评测，见 `eval/PLAN_EVAL.md`。

## 环境与选卡规划

### 分工

| 部分 | 做什么 | 依据 |
| --- | --- | --- |
| 规则（`src/env-plan.mjs`） | 读出明确写法：`torch==x`、`+cu121`、`python>=3.8`、`cudatoolkit=11.3`、`nvidia/cuda:11.8`、“至少 24GB 显存”、“requires around 14GB of GPU memory”、`flash-attn`、`--bf16`、`get_arch_list()` 输出等 | 原文所在行作为出处 |
| 模型（可选） | 按用户需求从表格或说明文字中挑出对应的显存、卡数、版本 | 必须附原文片段 |
| 引用核对（`checkModelItems`） | 字段白名单；片段必须是发送文本中的连续原文，并含有该值（版本号、数字、框架或特性名）；不符合就丢弃并写明原因 | — |
| 合并（`mergeConstraints`） | 依赖文件里的版本、框架以规则为准，模型只填空；显存与卡数取决于用户要跑什么，引用核对通过时用模型的值，并记下规则读到的值 | — |
| 求解（`planGpus`） | 对同步到的每个 AutoDL 型号：单卡显存、架构对 CUDA / PyTorch 的下限、特性需要的架构、源环境内核能否在目标卡运行 | 见下表 |
| 官方镜像（`pickImageOption`） | 在 AutoDL 四级镜像菜单中逐级选择：满足条件的最高 PyTorch、满足条件的最低 CUDA | 菜单为当时只读读取的结果 |

| 架构 | CUDA 下限 | PyTorch 下限 | 来源 |
| --- | --- | --- | --- |
| Ampere（sm_80 / sm_86） | 11.0 | 1.7 | AutoDL 下单前提示；首个带 sm_80 内核的 PyTorch 正式版 |
| Ada（sm_89） | 11.3 | 1.7 | AutoDL 下单前提示；sm_86 内核在 sm_89 上二进制兼容 |
| Hopper（sm_90） | 11.8（仅提示） | 2.0（仅提示） | 更低版本只能靠 PTX 即时编译，需实测 |
| Blackwell（sm_100 / sm_120） | 12.8 | 2.7 | AutoDL 下单前提示；PyTorch 2.7 起带 sm_120 内核 |
| Volta / Pascal | CUDA 13 不再支持 | PyTorch 的 CUDA 12.8 及以上构建不含其内核（提示） | — |

型号名认不出架构（例如 vGPU-32GB、RTX 6000D）或同名有多种显存版本（例如 A100、RTX 3080、RTX 5090 D、“x2”写法）时标为“需核对”，不猜。

显存要求的来源（`vramNeed`）：资料写明的值优先；资料有多个显存数字时取最大的；都没有时按模型大小估算（`sizeEstimate`，确定性公式）：推理总显存 ≈ 1.2 × 参数量 × 每参数字节（EleutherAI《Transformer Math 101》；FP16/BF16 为 2，INT8 为 1，INT4 为 0.5），微调按 LLaMA-Factory README“硬件依赖”估算表（最近一列等比换算），多卡平分。资料中有多个参数量且需求里没写时不估算。显存要求未知时所有型号标“需核对”；显存要求来自模型补充时，满足的型号标“有风险”并附原文。

### 边界

- 规划只读取用户提交的文本和本机保存的型号目录（同步当时的空闲/总数，不是实时库存）。
- 不创建或修改任务，不授予费用权限，不执行命令。“填入新建任务”只填写表单，用户仍需确认并提交，提交前的库存、驱动、价格、镜像核对照常进行。
- 一个任务只等一种型号。
- 提示注入：资料里夹带的指令可能让模型输出带“原文依据”的错误数值，引用核对挡不住这种情况。缓解措施：依赖版本以规则为准；模型补充的条件在表格中单独标注并显示原文；结果须由用户确认。评测集中有一个合成的注入用例，结果见 `eval/PLAN_EVAL.md`。

## 配置

1. 打开侧栏“AI 环境与选卡”，在下方“模型设置（可选）”中选择接口类型，填写自己账号的 Key、Base URL（必须 HTTPS）与模型 ID。
2. 勾选“启用 AI 分析”并保存。保存设置不会请求模型。默认超时 60 秒，可设 5—120 秒；输出上限默认 2048。
3. 在规划表单勾选“让 AI 补充规则读不出的约束”与本次确认后提交；或在下方诊断表单提交日志。每次提交最多发起一次模型请求，不自动重试，不按库存轮询调用模型。

| 接口类型 | 默认 Base URL | 模型 ID | 请求方式 |
| --- | --- | --- | --- |
| DeepSeek | https://api.deepseek.com | 预填 deepseek-flash，可改为自己账号支持的模型 | Chat Completions，`response_format: json_object`，关闭 thinking |
| 阿里云百炼 / 通义千问 | https://dashscope.aliyuncs.com/compatible-mode/v1 | 用户填写 | Chat Completions，`enable_thinking: false`（百炼文档：千问混合思考模型多数默认开启思考，该参数为顶层参数）；请选支持关闭思考、支持非流式调用的模型 |
| 其他兼容接口 | 用户填写 HTTPS 地址 | 用户填写 | Chat Completions，Bearer Key，不附加厂商专属参数 |

Base URL 可以填写基础地址或完整的 /chat/completions 地址，服务端会规范化；不接受含账号、密码、查询参数或片段的 URL，不跟随接口重定向。资料超过 3000 字符时，只把与运行条件相关的行（GPU、显存、CUDA、torch、python、训练/推理等关键词，各带上下 1 行，最多 6000 字符）发给模型，减少 Token 用量；规则仍读取全部资料。一次规划的请求约 600～1100 Token（评测中 13 个用例的实测值）。

## Key、数据与费用

- Key 默认只在当前 Node 服务进程的内存保存；“记住 API Key 到本机”由用户勾选，Windows 下用 DPAPI CurrentUser 加密后写入 .runtime/state.json，不支持安全存储的平台不回退明文。“清除 Key 并停用”同时删除保存的副本。
- 公共状态只返回是否已有 Key，不回显原文。更换接口类型或 Base URL 时需要重新填写 Key。
- 只发送本次表单中的需求、项目资料和日志，不自动收集 AutoDL 凭据、任务记录、仓库或数据盘；输入和结果不写入状态文件。提交前做基础凭据脱敏，但不能识别所有私密内容。
- 调用可能由服务商计费；输出 Token 上限不代表费用封顶，取消或超时不保证服务商未计费。第三方如何处理请求以其服务条款为准。

这是单机本地应用：每位使用者在自己运行的服务里配置自己的 Key。不是多人服务。

## 实现与验证

- `src/env-plan.mjs`：规则提取、GPU 规格表、引用核对、合并、求解、官方镜像选择、实例检查命令。
- `src/ai.mjs`：连接配置与 Key 生命周期、Chat Completions 请求、超时与取消、规划抽取 `extract()`、诊断 `analyze()`。
- `src/server.mjs`：`/api/plan`（规划；模型失败仍返回规则结果）、`/api/plan/image`（只读官方镜像菜单并逐级选择），以及 `/api/ai/*`。均受本机令牌与同源保护。
- `public/plan.js`、`public/ai.js`、`public/images.js`：页面。
- 测试：`tests/env-plan.test.mjs`、`tests/ai.test.mjs`、`tests/server.test.mjs`（内存模型替身），`npm.cmd run test:plan-ui`、`npm.cmd run test:ui`（隔离浏览器回归）。
- 评测：`npm.cmd run eval:plan`，12 个公开项目 + 1 个合成注入用例，比较“只用规则”与“规则 + 模型”；模型组需要设置环境变量 `AI_EVAL_API_KEY`。见 `eval/PLAN_EVAL.md`。

## API 资料

以下地址用于接口预设；可用模型、地域、价格和权限以官方当前说明为准。

- DeepSeek：https://api-docs.deepseek.com/
- 百炼兼容接口：https://www.alibabacloud.com/help/en/model-studio/compatibility-of-openai-with-dashscope
- 百炼深度思考模型（`enable_thinking`）：https://help.aliyun.com/zh/model-studio/deep-thinking
