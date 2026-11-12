import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createApplication} from '../src/server.mjs';
import {Store} from '../src/store.mjs';
import {SyntheticAdapter} from './fixtures/synthetic-adapter.mjs';
import {configInput,testConfig} from './fixtures/config.mjs';

async function fixture(t) {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'manual-completion-'));
  const adapter=Object.assign(new SyntheticAdapter(),{sessionStatus:()=>({state:'ready',browserOpen:true})});
  const app=createApplication({runtimeDir:dir,startEngine:false,adapters:{autodl:adapter}});
  await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+app.server.address().port;
  const old=app.store.create(testConfig());
  const operation={stage:'click_started',at:Date.now(),baselineIds:[]};
  app.store.patch(old,{state:'cancelled',operation,lastError:'结果不明'});
  const request=(url,data)=>fetch(base+url,{method:'POST',headers:{'X-Local-Token':app.token,'Content-Type':'application/json'},body:JSON.stringify(data)});
  t.after(async()=>{await app.close();const target=path.resolve(dir);assert.equal(path.dirname(target),path.resolve(os.tmpdir()));assert.ok(path.basename(target).startsWith('manual-completion-'));fs.rmSync(target,{recursive:true,force:true});});
  return {app,old,operation,dir,request,continuation:()=>configInput({completeTaskId:old.id,confirmed:true,expectedUpdatedAt:old.updatedAt})};
}
test('手动完成须明确确认、拒绝忙碌和过期状态，完成后保留原提交及日志',async t=>{
  const f=await fixture(t),url='/api/tasks/'+f.old.id+'/complete';
  assert.equal((await f.request(url,{})).status,400);
  f.app.engine.busy=true;
  f.app.engine.workingTask=f.old;
  assert.equal((await f.request(url,{confirmed:true,expectedUpdatedAt:f.old.updatedAt})).status,409);
  f.app.engine.workingTask=null;
  assert.equal((await f.request(url,{confirmed:true,expectedUpdatedAt:0})).status,409);
  assert.equal((await f.request(url,{confirmed:true,expectedUpdatedAt:f.old.updatedAt})).status,200);
  assert.equal(f.app.engine.busy,true); // 另一个浏览器操作仍在运行。
  f.app.engine.busy=false;
  assert.equal(f.old.state,'completed');assert.deepEqual(f.old.operation,f.operation);
  assert.equal(f.old.result,null);assert.equal(f.old.manualCompletion.previousState,'cancelled');
  assert.equal(f.old.manualCompletion.previousError,'结果不明');
  assert.ok(f.old.logs.some(log=>log.message.includes('手动确认')));
  const restored=new Store(f.dir);assert.equal(restored.get(f.old.id).manualCompletion.at,f.old.manualCompletion.at);
  f.app.engine.recover();assert.deepEqual(f.old.operation,f.operation);
  assert.equal((await f.request('/api/tasks',configInput())).status,201);
  const next=f.app.store.tasks()[0];assert.equal(f.app.engine.pendingOverlap(next),null);
});
test('冲突继续创建只豁免明确确认的原任务，其他冲突仍阻止创建',async t=>{
  const f=await fixture(t);
  assert.equal((await f.request('/api/tasks',configInput())).status,409);
  assert.equal((await f.request('/api/tasks',{...f.continuation(),confirmed:false})).status,400);
  const other=f.app.store.create(testConfig());f.app.store.patch(other,{state:'paused'});
  assert.equal((await f.request('/api/tasks',f.continuation())).status,409);
  assert.equal(f.old.state,'cancelled');assert.equal(f.old.manualCompletion,undefined);
});
test('继续创建失败时原任务不变，成功时新旧记录同时保存，重试不重复创建',async t=>{
  const f=await fixture(t),input=f.continuation();
  const save=f.app.store.save.bind(f.app.store);f.app.store.save=()=>{throw Error('synthetic save failure')};
  assert.equal((await f.request('/api/tasks',input)).status,500);
  assert.equal(f.old.state,'cancelled');assert.equal(f.old.manualCompletion,undefined);
  assert.equal(f.app.store.tasks().length,1);assert.deepEqual(f.old.operation,f.operation);
  f.app.store.save=save;
  const response=await f.request('/api/tasks',input);assert.equal(response.status,201);
  const next=(await response.json()).task;
  assert.equal(f.old.state,'completed');assert.equal(f.old.continuedBy,next.id);assert.equal(next.continuesTaskId,f.old.id);
  assert.deepEqual(f.old.operation,f.operation);assert.equal(f.app.store.tasks().length,2);
  const disk=JSON.parse(fs.readFileSync(path.join(f.dir,'state.json'),'utf8'));
  assert.equal(disk.tasks.find(task=>task.id===f.old.id).continuedBy,next.id);
  assert.equal((await f.request('/api/tasks',input)).status,409);assert.equal(f.app.store.tasks().length,2);
});
test('单独手动完成保存失败时恢复原状态，恢复后可重试',async t=>{
  const f=await fixture(t),save=f.app.store.save.bind(f.app.store);
  f.app.store.save=()=>{throw Error('synthetic save failure')};
  assert.equal((await f.request('/api/tasks/'+f.old.id+'/complete',{confirmed:true,expectedUpdatedAt:f.old.updatedAt})).status,500);
  assert.equal(f.old.state,'cancelled');assert.equal(f.old.manualCompletion,undefined);
  f.app.store.save=save;
  assert.equal((await f.request('/api/tasks/'+f.old.id+'/complete',{confirmed:true,expectedUpdatedAt:f.old.updatedAt})).status,200);
});

test('删除须确认，结果不明的提交须先完成，删除后记录保留且队列不再返回',async t=>{
  const f=await fixture(t),url='/api/tasks/'+f.old.id+'/delete';
  assert.equal((await f.request(url,{})).status,400);
  assert.equal((await f.request(url,{confirmed:true,expectedUpdatedAt:f.old.updatedAt})).status,409);
  f.app.store.completeManually(f.old);
  assert.equal((await f.request(url,{confirmed:true,expectedUpdatedAt:f.old.updatedAt})).status,200);
  assert.ok(f.old.deletedAt);assert.deepEqual(f.old.operation,f.operation);
  assert.equal(f.app.store.publicState().tasks.length,0);
  const restored=new Store(f.dir);assert.equal(restored.publicState().tasks.length,0);
  assert.deepEqual(restored.get(f.old.id).operation,f.operation);
  assert.equal((await f.request('/api/tasks/'+f.old.id+'/resume',{})).status,404);
  assert.equal((await f.request(url,{confirmed:true,expectedUpdatedAt:0})).status,200);
});
test('删除无提交任务会停止后续检查，保存失败时原任务仍可见',async t=>{
  const f=await fixture(t);f.app.store.patch(f.old,{operation:null,state:'watching'});
  const url='/api/tasks/'+f.old.id+'/delete',input={confirmed:true,expectedUpdatedAt:f.old.updatedAt};
  const save=f.app.store.save.bind(f.app.store);f.app.store.save=()=>{throw Error('synthetic-save-failure')};
  assert.equal((await f.request(url,input)).status,500);
  assert.equal(f.old.state,'watching');assert.equal(f.old.deletedAt,undefined);assert.equal(f.app.store.publicState().tasks.length,1);
  f.app.store.save=save;f.app.engine.busy=true;
  assert.equal((await f.request(url,input)).status,409);f.app.engine.busy=false;
  assert.equal((await f.request(url,input)).status,200);assert.equal(f.old.state,'cancelled');
  f.app.engine.recover();assert.equal(f.old.state,'cancelled');
  assert.equal((await f.request('/api/tasks',configInput())).status,201);
});
