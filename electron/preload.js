const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('netspectreAPI', {
  platform: process.platform,
  version: '3.1.0',
  isElectron: true,
  getSessionToken: () => ipcRenderer.invoke('get-session-token'),
  sendNotification: (title, body) => ipcRenderer.send('show-notification', { title, body }),
  openExternal: (url) => ipcRenderer.send('open-external', url),
});
