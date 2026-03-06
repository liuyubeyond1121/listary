import React, { useCallback, useEffect, useRef, useState } from 'react'
import FileSearch from './components/FileSearch'
import ResultList from './components/ResultList'
import SettingsPanel from './components/SettingsPanel'
import { SearchResult } from './types'
import { useFileSearch } from './hooks/useFileSearch'
import { useFolderIndex } from './hooks/useFolderIndex'
import './App.css'

const isElectron = typeof window !== 'undefined' && !!window.electronAPI

const App: React.FC = () => {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const { results, debouncedSearch, loading } = useFileSearch()
  const { stats, scanFolder, clearIndex, indexing, indexedFolders } = useFolderIndex()

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isCtrlSpace = e.ctrlKey && e.code === 'Space' && !e.repeat
      const isCtrlShiftSpace = e.ctrlKey && e.shiftKey && e.code === 'Space' && !e.repeat
      if (isCtrlSpace || isCtrlShiftSpace) {
        e.preventDefault()
        setIsVisible((prev) => {
          const next = !prev
          if (next) {
            setQuery('')
            setSelectedIndex(0)
          }
          return next
        })
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [])

  useEffect(() => {
    if (!isElectron) return
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'electron-open-search') {
        setIsVisible(true)
        setQuery('')
        setSelectedIndex(0)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  useEffect(() => {
    debouncedSearch(query)
  }, [query, debouncedSearch])

  useEffect(() => {
    if (isVisible && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isVisible])

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value)
    setSelectedIndex(0)
  }, [])

  const handleResultClick = useCallback(async (result: SearchResult) => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      await window.electronAPI.openFile(result.path)
    }
    setIsVisible(false)
    setQuery('')
  }, [])

  const handleResultKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isVisible) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (results[selectedIndex]) {
          handleResultClick(results[selectedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        setIsVisible(false)
        setQuery('')
        break
      case 'F2':
        if (results[selectedIndex] && e.ctrlKey && typeof window !== 'undefined' && window.electronAPI) {
          e.preventDefault()
          window.electronAPI.showFileInFolder(results[selectedIndex].path)
        }
        break
      default:
        break
    }
  }, [isVisible, results, selectedIndex, handleResultClick])

  return (
    <>
      <div className="background-hint">
        <div className="hint-content">
          {!isElectron && (
            <p className="env-warning">
              当前为浏览器环境，搜索与索引功能不可用。请使用 <code>npm run electron:dev</code> 启动完整应用。
            </p>
          )}
          <h1>文件搜索工具</h1>
          <p>
            按下 <kbd>Ctrl + Space</kbd> 或 <kbd>Ctrl + Shift + Space</kbd> 打开搜索面板（若 Ctrl+Space 被输入法占用，请用后者）
          </p>
          <button className="settings-button" onClick={() => setShowSettings(true)} aria-label="打开设置">
            打开设置
          </button>
          {stats.totalFiles === 0 ? (
            <p className="stats-hint empty-index">
              尚未索引任何目录，请先 <button type="button" className="inline-link" onClick={() => setShowSettings(true)}>添加索引目录</button> 以开始搜索
            </p>
          ) : (
            <p className="stats-hint">
              已索引文件 {stats.totalFiles.toLocaleString()} 个，文件夹 {stats.totalFolders.toLocaleString()} 个
            </p>
          )}
        </div>
      </div>

      {isVisible && (
        <div
          className="search-overlay"
          onClick={() => setIsVisible(false)}
          role="dialog"
          aria-modal="true"
          aria-label="文件搜索"
        >
          <div
            className="search-container"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleResultKeyDown}
            role="combobox"
            aria-expanded={true}
            aria-haspopup="listbox"
          >
            <FileSearch query={query} onQueryChange={handleQueryChange} inputRef={inputRef} onClose={() => setIsVisible(false)} />
            {query && (
              <ResultList
                results={results}
                selectedIndex={selectedIndex}
                loading={loading}
                onResultClick={handleResultClick}
                onHover={setSelectedIndex}
              />
            )}
          </div>
        </div>
      )}

      {showSettings && (
        <SettingsPanel
          stats={stats}
          indexedFolders={indexedFolders}
          indexing={indexing}
          onClose={() => setShowSettings(false)}
          onScan={scanFolder}
          onClearIndex={clearIndex}
        />
      )}
    </>
  )
}

export default App
