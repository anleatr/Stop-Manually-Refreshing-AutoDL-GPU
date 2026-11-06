import { _electron } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const config=JSON.parse(fs.readFileSync(path.join(root,'desktop','builder.json'),'utf8'));
const executablePath=path.join(root,config.directories.output,'win-unpacked',config.productName+'.exe');
assert.ok(fs.existsSync(executablePath),'请先运行 npm run desktop:pack');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'autodl-desktop-test-'));
const env={...process.env,AUTODL_RUNTIME_DIR:path.join(dir,'runtime')};
delete env.ELECTRON_RUN_AS_NODE;
let desktop;
try {
  desktop=await _electron.launch({executablePath,args:['--user-data-dir='+path.join(dir,'desktop')],env});
  const page=await desktop.firstWindow(), errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.waitForFunction(()=>document.querySelector('#connection').textContent==='已连接');
  assert.equal(await page.locator('.nav-item').count(),4);
  assert.equal(await page.locator('#account').isVisible(),true);
  await page.locator('[data-view=dashboard]').click();
  assert.equal(await page.locator('#submit-task').innerText(),'创建任务');
  assert.equal(await page.locator('#pricing-card').isVisible(),false);
  await page.locator('[data-mode=clone]').click();
  assert.equal(await page.locator('#live-source-fields').isVisible(),true);
  await page.locator('[data-view=queue]').click();
  assert.equal(await page.locator('#queue .metrics small').count(),0);
  await desktop.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].close());
  assert.equal(await desktop.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].isVisible()),false);
  assert.deepEqual(errors,[]);
  console.log('桌面启动、导航、高级设置及关闭到托盘通过。');
} finally {
  await desktop?.close();
  const target=path.resolve(dir);
  assert.equal(path.dirname(target),path.resolve(os.tmpdir()));
  assert.ok(path.basename(target).startsWith('autodl-desktop-test-'));
  fs.rmSync(target,{recursive:true,force:true});
}
