export interface SearchResultDTO {
  id: string
  name: string
  path: string
  type: 'file' | 'folder'
  extension?: string
  size?: number
  modifiedDate?: string
  icon?: string
}

export interface ElectronAPI {
  scanFolder: (folderPath: string) => Promise<{ success: boolean; count?: number; scannedPath?: string; error?: string }>
  searchFiles: (query: string) => Promise<SearchResultDTO[]>
  openFile: (filePath: string) => Promise<{ success: boolean; error?: string }>
  showFileInFolder: (filePath: string) => Promise<{ success: boolean; error?: string }>
  getStats: () => Promise<{ totalFiles: number; totalFolders: number; totalSize: number }>
  clearIndex: () => Promise<{ success: boolean; error?: string }>
  browseFolder: () => Promise<{ success: boolean; path?: string; canceled?: boolean }>
  getIndexedFolders: () => Promise<string[]>
  hideSearchPopup: () => Promise<void>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
