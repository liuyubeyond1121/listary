/// <reference lib="dom" />
import { contextBridge, ipcRenderer } from 'electron'

ipcRenderer.on('open-search', () => {
  window.postMessage({ type: 'electron-open-search' }, '*')
})

contextBridge.exposeInMainWorld('electronAPI', {
  scanFolder: (folderPath: string) => ipcRenderer.invoke('scan-folder', folderPath),
  searchFiles: (query: string) => ipcRenderer.invoke('search-files', query),
  openFile: (filePath: string) => ipcRenderer.invoke('open-file', filePath),
  showFileInFolder: (filePath: string) => ipcRenderer.invoke('show-file-in-folder', filePath),
  getStats: () => ipcRenderer.invoke('get-stats'),
  clearIndex: () => ipcRenderer.invoke('clear-index'),
  browseFolder: () => ipcRenderer.invoke('browse-folder'),
  getIndexedFolders: () => ipcRenderer.invoke('get-indexed-folders'),
})
