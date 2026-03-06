export interface SearchResult {
  id: string
  name: string
  path: string
  type: 'file' | 'folder'
  extension?: string
  size?: number
  modifiedDate?: string
  icon?: string
}

export interface IndexStats {
  totalFiles: number
  totalFolders: number
  totalSize: number
}
