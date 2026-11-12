const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopStorage', {
  changeDirectory: () => ipcRenderer.send('desktop:change-data-directory'),
});
