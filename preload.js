const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('aspire', {
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSetting: (key, value) => ipcRenderer.invoke('set-setting', key, value),
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),

  // Auto-update
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  onUpdateAvailable: (cb) => ipcRenderer.on('update-available', (_, version) => cb(version)),
  onUpdateProgress: (cb) => ipcRenderer.on('update-progress', (_, percent) => cb(percent)),
  onUpdateDownloaded: (cb) => ipcRenderer.on('update-downloaded', () => cb()),

  // Pop-out panels
  popoutPanel: (panel) => ipcRenderer.invoke('popout-panel', panel),
  onPopoutClosed: (cb) => ipcRenderer.on('popout-closed', (_, panel) => cb(panel)),
  popoutMinimize: () => ipcRenderer.invoke('popout-minimize'),
  popoutClose: () => ipcRenderer.invoke('popout-close')
});
