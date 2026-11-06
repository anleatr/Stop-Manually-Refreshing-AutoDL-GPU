import { app, BrowserWindow, Menu, Tray, dialog, nativeImage, session } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createApplication } from '../src/server.mjs';

const directory = path.dirname(fileURLToPath(import.meta.url));
const icon = nativeImage.createFromPath(path.join(directory, 'icon.png'));
let service, window, tray, quitting = false;
function show() {
  if (!window || window.isDestroyed()) return;
  if (window.isMinimized()) window.restore();
  window.show();
  window.focus();
}
async function quit() {
  if (quitting) return;
  quitting = true;
  try { await service?.close(); }
  catch (error) { dialog.showErrorBox('退出失败', error.message); }
  finally { app.quit(); }
}
async function start() {
  const runtimeDir = process.env.AUTODL_RUNTIME_DIR || path.join(app.getPath('userData'), 'runtime');
  process.env.AUTODL_BROWSER_CHANNEL ||= 'msedge';
  service = createApplication({ runtimeDir, desktopSession: true, onStop: quit });
  await new Promise((resolve, reject) => {
    service.server.once('error', reject);
    service.server.listen(0, '127.0.0.1', resolve);
  });
  const origin = 'http://127.0.0.1:' + service.server.address().port;
  window = new BrowserWindow({ title:'AutoDL GPU 候机室', width:1320, height:900, minWidth:800, minHeight:600, icon,
    show:false, webPreferences:{ nodeIntegration:false, contextIsolation:true, sandbox:true, backgroundThrottling:false } });
  window.removeMenu();
  window.webContents.setWindowOpenHandler(() => ({ action:'deny' }));
  window.webContents.on('will-navigate', (event, url) => { if (new URL(url).origin !== origin) event.preventDefault(); });
  session.defaultSession.setPermissionRequestHandler((contents, permission, callback) =>
    callback(contents === window.webContents && new URL(contents.getURL()).origin === origin && permission === 'notifications'));
  tray = new Tray(icon.resize({width:32,height:32}));
  tray.setToolTip('AutoDL GPU 候机室');
  tray.setContextMenu(Menu.buildFromTemplate([{ label:'打开监测台', click:show }, { type:'separator' }, { label:'退出', click:quit }]));
  tray.on('click', show);
  window.on('close', event => { if (!quitting) { event.preventDefault(); window.hide(); } });
  await window.loadURL(origin);
  show();
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.setAppUserModelId('local.autodl.gpuwatch');
  app.on('second-instance', show);
  app.on('before-quit', event => { if (!quitting) { event.preventDefault(); void quit(); } });
  app.whenReady().then(start).catch(async error => {
    const message = error.code === 'LOCK' ? '已有监测台正在使用此资料目录。请先正常退出旧监测台，再打开桌面版。' : error.message;
    fs.mkdirSync(app.getPath('logs'), {recursive:true});
    fs.appendFileSync(path.join(app.getPath('logs'), 'startup.log'), new Date().toISOString() + ' ' + message + '\n');
    dialog.showErrorBox('监测台启动失败', message);
    await quit();
  });
}
