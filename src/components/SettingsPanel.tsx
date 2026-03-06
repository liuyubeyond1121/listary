import React, { useEffect, useMemo, useState } from 'react'
import { Database, FolderOpen, RefreshCw, Trash2, X } from 'lucide-react'
import { IndexStats } from '../types'
import { formatSize } from '../utils/format'
import './SettingsPanel.css'

interface SettingsPanelProps {
  stats: IndexStats
  indexedFolders: string[]
  indexing: boolean
  onClose: () => void
  onScan: (path: string) => Promise<{ success: boolean; count?: number; scannedPath?: string; error?: string }>
  onClearIndex: () => Promise<{ success: boolean; error?: string }>
}

type Message = {
  type: 'success' | 'error'
  text: string
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  stats,
  indexedFolders,
  indexing,
  onClose,
  onScan,
  onClearIndex,
}) => {
  const [selectedPath, setSelectedPath] = useState('')
  const [message, setMessage] = useState<Message | null>(null)

  const normalizedFolders = useMemo(() => indexedFolders.filter(Boolean), [indexedFolders])

  const scanByPath = async (targetPath: string) => {
    if (!targetPath.trim()) {
      setMessage({ type: 'error', text: '请先输入目录路径。' })
      return
    }

    setMessage(null)
    const result = await onScan(targetPath)

    if (result.success) {
      setSelectedPath(result.scannedPath ?? targetPath)
      setMessage({
        type: 'success',
        text: `索引完成，共新增或更新 ${result.count ?? 0} 条记录。`,
      })
      return
    }

    setMessage({ type: 'error', text: result.error || '索引失败，请检查路径权限。' })
  }

  const handleFolderBrowse = async () => {
    if (typeof window === 'undefined' || !window.electronAPI) {
      setMessage({ type: 'error', text: '当前环境不支持浏览目录。' })
      return
    }

    const result = await window.electronAPI.browseFolder()
    if (!result.success || !result.path) {
      return
    }

    setSelectedPath(result.path)
    setMessage(null)
  }

  const handleClearIndex = async () => {
    const result = await onClearIndex()
    if (result.success) {
      setMessage({ type: 'success', text: '索引已清空。' })
      return
    }

    setMessage({ type: 'error', text: result.error || '清空索引失败。' })
  }

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose])

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>设置</h2>
          <button className="close-btn" onClick={onClose} aria-label="关闭设置">
            <X size={20} />
          </button>
        </div>

        <div className="settings-content">
          <div className="stats-card">
            <Database size={32} />
            <div>
              <div className="stats-number">{stats.totalFiles.toLocaleString()}</div>
              <div className="stats-label">已索引文件</div>
              <div className="stats-extra">
                文件夹 {stats.totalFolders.toLocaleString()} | 文件总大小 {formatSize(stats.totalSize)}
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h3>索引目录</h3>
            <div className="path-input-group">
              <input
                type="text"
                value={selectedPath}
                onChange={(e) => setSelectedPath(e.target.value)}
                placeholder="输入目录，例如：C:\\Users\\YourName\\Documents"
                className="path-input"
              />
              <button className="scan-button secondary" onClick={handleFolderBrowse} disabled={indexing}>
                <FolderOpen size={16} />
                浏览
              </button>
              <button className="scan-button" onClick={() => scanByPath(selectedPath)} disabled={indexing}>
                {indexing ? (
                  <>
                    <RefreshCw size={16} className="spin" />
                    索引中
                  </>
                ) : (
                  <>
                    <RefreshCw size={16} />
                    开始索引
                  </>
                )}
              </button>
            </div>
            <p className="help-text">建议先索引常用目录，后续搜索速度会显著提升。</p>

            {normalizedFolders.length > 0 && (
              <div className="recent-folders">
                <div className="recent-title">最近索引目录</div>
                {normalizedFolders.map((folder) => (
                  <button key={folder} className="folder-chip" onClick={() => scanByPath(folder)} disabled={indexing}>
                    {folder}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="settings-section">
            <h3>索引管理</h3>
            <button className="clear-button" onClick={handleClearIndex} disabled={indexing}>
              <Trash2 size={16} />
              清空全部索引
            </button>
          </div>

          {message && <div className={`message ${message.type}`}>{message.text}</div>}
        </div>
      </div>
    </div>
  )
}

export default SettingsPanel
