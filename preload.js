const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  downloadFile: (args) => ipcRenderer.invoke('download-file', args),
  showErrorMessage: (args) => ipcRenderer.send('show-error-message', args),
  showInfoMessage: (args) => ipcRenderer.send('show-info-message', args),
  getProfileFolders: () => ipcRenderer.invoke('get-profile-folders'),
  browseForDirectory: () => ipcRenderer.invoke('browse-for-directory'),
  onDownloadStarted: (callback) => ipcRenderer.on('download-started', (_event, value) => callback(value)),
  onDownloadProgress: (callback) => ipcRenderer.on('download-progress', (_event, value) => callback(value)),
  onDownloadComplete: (callback) => ipcRenderer.on('download-complete', (_event, value) => callback(value)),
  onDownloadError: (callback) => ipcRenderer.on('download-error', (_event, value) => callback(value)),
  removeAllDownloadListeners: () => {
    ipcRenderer.removeAllListeners('download-started');
    ipcRenderer.removeAllListeners('download-progress');
    ipcRenderer.removeAllListeners('download-complete');
    ipcRenderer.removeAllListeners('download-error');
  }
});
