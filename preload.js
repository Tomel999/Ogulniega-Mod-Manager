const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    searchCurseforge: (args) => ipcRenderer.invoke('search-curseforge', args),
    getModFilesCurseforge: (args) => ipcRenderer.invoke('get-mod-files-curseforge', args),
    getProfileFolders: () => ipcRenderer.invoke('get-profile-folders'),
    getShaderPath: () => ipcRenderer.invoke('get-shader-path'),
    browseForDirectory: () => ipcRenderer.invoke('browse-for-directory'),
    downloadFile: (args) => ipcRenderer.invoke('download-file', args),
    getPreinstalledMods: (profilePath) => ipcRenderer.invoke('get-preinstalled-mods', profilePath),
    showItemInFolder: (filePath) => ipcRenderer.send('show-item-in-folder', filePath),
    toggleModState: (currentPath) => ipcRenderer.invoke('toggle-mod-state', currentPath),
    showErrorMessage: (args) => ipcRenderer.send('show-error-message', args),
    showInfoMessage: (args) => ipcRenderer.send('show-info-message', args),
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
