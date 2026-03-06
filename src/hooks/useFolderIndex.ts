import { useState, useCallback, useEffect } from 'react'
import { IndexStats } from '../types'

const initialStats: IndexStats = {
  totalFiles: 0,
  totalFolders: 0,
  totalSize: 0,
}

export const useFolderIndex = () => {
  const [indexing, setIndexing] = useState(false)
  const [stats, setStats] = useState<IndexStats>(initialStats)
  const [indexedFolders, setIndexedFolders] = useState<string[]>([])

  const updateStats = useCallback(async () => {
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.getStats()
        setStats(result)
      }
    } catch (error) {
      console.error('Error getting stats:', error)
    }
  }, [])

  const updateIndexedFolders = useCallback(async () => {
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.getIndexedFolders()
        setIndexedFolders(result)
      }
    } catch (error) {
      console.error('Error getting indexed folders:', error)
    }
  }, [])

  useEffect(() => {
    updateStats()
    updateIndexedFolders()
  }, [updateStats, updateIndexedFolders])

  const scanFolder = useCallback(
    async (folderPath: string) => {
      setIndexing(true)

      try {
        if (typeof window !== 'undefined' && window.electronAPI) {
          const result = await window.electronAPI.scanFolder(folderPath)
          await Promise.all([updateStats(), updateIndexedFolders()])
          return result
        }

        return { success: false, error: 'Electron API not available' }
      } catch (error) {
        return { success: false, error: (error as Error).message }
      } finally {
        setIndexing(false)
      }
    },
    [updateStats, updateIndexedFolders]
  )

  const clearIndex = useCallback(async () => {
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.clearIndex()
        await Promise.all([updateStats(), updateIndexedFolders()])
        return result
      }

      return { success: false, error: 'Electron API not available' }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }, [updateStats, updateIndexedFolders])

  return {
    indexing,
    stats,
    indexedFolders,
    scanFolder,
    clearIndex,
    updateStats,
    updateIndexedFolders,
  }
}
