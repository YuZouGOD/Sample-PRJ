const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    checkDocker: () => ipcRenderer.invoke('check-docker'),
    checkDockerCompose: () => ipcRenderer.invoke('check-docker-compose'),
    startServices: (installPath) => ipcRenderer.invoke('start-services', installPath),
    stopServices: (installPath) => ipcRenderer.invoke('stop-services', installPath),
    selectInstallPath: () => ipcRenderer.invoke('select-install-path'),
    cancelServices: () => ipcRenderer.invoke('cancel-services'),

    // Para desarrollo
    onUpdateStatus: (callback) => ipcRenderer.on('update-status', callback)
});

