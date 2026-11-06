import { chromium } from 'playwright';
import { createApplication } from '../src/server.mjs';
import { SyntheticAdapter } from '../tests/fixtures/synthetic-adapter.mjs';
import { seedGpuCatalog } from '../tests/fixtures/gpu-catalog.mjs';
import { normalizeConfig } from '../src/config.mjs';
import { configInput } from '../tests/fixtures/config.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'autodl-queue-ui-'));
let now = Date.now(), balanceCalls = 0;
const adapter = Object.assign(new SyntheticAdapter(), {
  sessionStatus: () => ({ state:'ready', browserOpen:true, label:'会话可用', readySince:1 }),
  instances: async () => [],
});
const app = createApplication({
  runtimeDir:dir, startEngine:false, adapters:{autodl:adapter},
  walletOptions:{ clock:()=>now, fetchImpl:async()=>{
    balanceCalls++;
    return new Response(JSON.stringify({code:'Success',data:{assets:100000+balanceCalls*1000,voucher_balance:0}}));
  }},
});
seedGpuCatalog(app.store);
app.wallet.setToken('synthetic-wallet-not-real');
for (let i=0;i<20;i++) {
  const task=app.store.create(normalizeConfig(configInput({name:'队列测试任务 '+i})));
  app.store.patch(task,{state:'cancelled'});
}
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
  await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+app.server.address().port;
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
  await page.addInitScript(value=>{Date.now=()=>value;},now);
  await page.goto(base);
  await page.waitForFunction(()=>document.querySelector('#wallet-balance').textContent==='¥101.000');
  assert.equal(balanceCalls,1);
  await page.locator('[data-view=dashboard]').click();
  await page.locator('[data-view=account]').click();
  await page.waitForTimeout(2200);
  assert.equal(balanceCalls,1,'切页不会提前刷新余额');
  const initial=app.wallet.snapshot.checkedAt;
  now=initial+599999;
  await page.evaluate(value=>{Date.now=()=>value;return refresh();},now);
  await page.waitForTimeout(200);
  assert.equal(balanceCalls,1,'10分钟前不自动请求');
  now=initial+600000;
  await page.evaluate(value=>{Date.now=()=>value;return refresh();},now);
  await page.waitForFunction(()=>document.querySelector('#wallet-balance').textContent==='¥102.000');
  assert.equal(balanceCalls,2,'10分钟时自动请求一次');
  await page.locator('#refresh-wallet').click();
  await page.waitForFunction(()=>document.querySelector('#wallet-balance').textContent==='¥103.000');
  assert.equal(balanceCalls,3,'手动刷新仍可用');
  assert.equal(await page.locator('[data-view=notifications],#notifications').count(),0);
  await page.locator('[data-view=queue]').click();
  if(await page.locator('#tasks').isHidden())await page.locator('#toggle-queue').click();
  assert.equal(await page.locator('#tasks').evaluate(node=>getComputedStyle(node).overflowY),'visible');
  await page.evaluate(()=>{
    window.savedCard=document.querySelector('[data-task-id]');
    window.savedButton=window.savedCard.querySelector('[data-detail]');
  });
  await page.mouse.move(1100,700);
  await page.mouse.wheel(0,1600);
  await page.waitForTimeout(300);
  const before=await page.evaluate(()=>scrollY);
  assert.ok(before>500);
  const task=app.store.tasks()[0];
  task.attempts++;task.updatedAt++;
  await page.evaluate(()=>refresh());
  await page.waitForTimeout(500);
  assert.equal(await page.evaluate(()=>window.savedCard===document.querySelector('[data-task-id]')),true);
  assert.equal(await page.evaluate(()=>window.savedButton===document.querySelector('[data-task-id] [data-detail]')),true);
  assert.ok(Math.abs(await page.evaluate(()=>scrollY)-before)<=2,'刷新不打断滚动位置');
  await page.mouse.wheel(0,600);
  await page.waitForTimeout(200);
  assert.ok(await page.evaluate(()=>scrollY)>before,'滚轮可继续向下滚动');
  await page.locator('[data-view=account]').click();
  await page.locator('[data-view=queue]').click();
  assert.equal(await page.evaluate(()=>scrollY),0,'重新进入队列从顶部开始');
  assert.deepEqual(errors,[]);
  console.log('余额10分钟边界、手动刷新、消息中心移除、队列滚轮/刷新稳定性及切页回顶通过。');
} finally {
  await browser.close();
  await app.close();
  const target=path.resolve(dir);
  assert.equal(path.dirname(target),path.resolve(os.tmpdir()));
  assert.ok(path.basename(target).startsWith('autodl-queue-ui-'));
  fs.rmSync(target,{recursive:true,force:true});
}
