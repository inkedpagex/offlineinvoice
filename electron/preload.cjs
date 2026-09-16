const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  dbGet: (key) => ipcRenderer.invoke('db:get', key),
  dbSet: (key, value) => ipcRenderer.invoke('db:set', key, value),
  dbGetAll: () => ipcRenderer.invoke('db:getAll'),
  dbSaveAll: (data) => ipcRenderer.invoke('db:saveAll', data),
  isElectron: true,
});
