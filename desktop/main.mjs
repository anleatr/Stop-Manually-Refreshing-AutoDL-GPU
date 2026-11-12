import { app, BrowserWindow, Menu, Tray, dialog, nativeImage, session, ipcMain } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createApplication } from '../src/server.mjs';
import { emptyDestination, migrateRuntime, runtimeDirectory } from './data-directory.mjs';
import { taskIndicator, badgeBitmap } from './task-indicator.mjs';

const directory = path.dirname(fileURLToPath(import.meta.url));
const icon = nativeImage.createFromPath(path.join(directory, 'icon.png'));
let service, window, tray, runtimeDir, migrating = false, quitting = false;
function show() {
  if (!window || window.isDestroyed()) return;
  if (window.isMinimized()) window.restore();
  window.show();
  window.focus();
}
async function quit() {
  if (quitting || migrating) return;
  quitting = true;
  try { await service?.close(); }
  catch (error) { dialog.showErrorBox('退出失败', error.message); }
  finally { app.quit(); }
}
async function changeDataDirectory() {
  if (migrating || quitting) return;
  migrating = true;
  let restart = false;
  try {
    const selection = await dialog.showOpenDialog(window, {
      title: '选择新的数据存储目录',
      defaultPath: runtimeDir,
      properties: ['openDirectory'],
    });
    if (selection.canceled) return;
    const destination = await emptyDestination(runtimeDir, selection.filePaths[0]);
    const { response } = await dialog.showMessageBox(window, {
      type: 'question',
      message: '迁移数据并重启？',
      detail: '当前目录：' + runtimeDir + '\n目标目录：' + destination +
        '\n\n软件将短暂停止监测，复制任务、设置和登录资料。旧目录会保留。',
      buttons: ['迁移并重启', '取消'],
      defaultId: 1,
      cancelId: 1,
    });
    if (response !== 0) return;
    restart = true;
    await service.close(() => migrateRuntime(runtimeDir, destination, app.getPath('userData')));
  } catch (error) {
    dialog.showErrorBox('数据迁移失败', error.message);
  } finally {
    migrating = false;
    if (restart) {
      quitting = true;
      app.relaunch();
      app.quit();
    }
  }
}
async function start() {
  runtimeDir = runtimeDirectory(app.getPath('userData'));
  process.env.AUTODL_BROWSER_CHANNEL ||= 'msedge';
  service = createApplication({ runtimeDir, desktopSession: true, onStop: quit });
  await new Promise((resolve, reject) => {
    service.server.once('error', reject);
    service.server.listen(0, '127.0.0.1', resolve);
  });
  const origin = 'http://127.0.0.1:' + service.server.address().port;
  window = new BrowserWindow({ title:'AutoDL GPU 候机室', width:1320, height:900, minWidth:800, minHeight:600, icon,
    show:false, webPreferences:{ nodeIntegration:false, contextIsolation:true, sandbox:true, backgroundThrottling:false, preload:path.join(directory, 'preload.cjs') } });
  window.removeMenu();
  ipcMain.on('desktop:change-data-directory', event => {
    if (event.senderFrame === window.webContents.mainFrame) void changeDataDirectory();
  });
  window.webContents.setWindowOpenHandler(() => ({ action:'deny' }));
  window.webContents.on('will-navigate', (event, url) => { if (new URL(url).origin !== origin) event.preventDefault(); });
  session.defaultSession.setPermissionRequestHandler((contents, permission, callback) =>
    callback(contents === window.webContents && new URL(contents.getURL()).origin === origin && permission === 'notifications'));
  tray = new Tray(icon.resize({width:32,height:32}));
  tray.setToolTip('AutoDL GPU 候机室');
  tray.setContextMenu(Menu.buildFromTemplate([{ label:'打开监测台', click:show }, { type:'separator' }, { label:'退出', click:quit }]));
  tray.on('click', show);
  const badges = new Map();
  let lastIndicator = null;
  const updateIndicator = () => {
    const state = taskIndicator(service.store.tasks());
    if (state === lastIndicator) return;
    lastIndicator = state;
    const colors = { searching: [34, 197, 94], allocated: [59, 130, 246], attention: [250, 204, 21] };
    const labels = { searching: '正在搜索 GPU', allocated: '已占到 GPU', attention: '需要人工确认' };
    if (state && !badges.has(state))
      badges.set(state, nativeImage.createFromBitmap(badgeBitmap(colors[state]), { width: 16, height: 16 }));
    if (process.platform === 'win32') window.setOverlayIcon(badges.get(state) || null, labels[state] || '');
    tray.setToolTip('AutoDL GPU 候机室' + (state ? ' · ' + labels[state] : ''));
  };
  const indicatorTimer = setInterval(updateIndicator, 500);
  window.once('closed', () => clearInterval(indicatorTimer));
  // 重新显示窗口时任务栏按钮会重新创建，下次轮询重新附加状态。
  window.on('show', () => { lastIndicator = undefined; });
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
