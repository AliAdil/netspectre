const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('netspectreAPI', {
  platform: process.platform,
  version: '2.4.0',
  isElectron: true,
});
