import React from 'react'
import { Clock, File, FileText, Folder, Image as ImageIcon, Loader2, Music, Video } from 'lucide-react'
import { SearchResult } from '../types'
import { formatSize, formatDate } from '../utils/format'
import './ResultList.css'

interface ResultListProps {
  results: SearchResult[]
  selectedIndex: number
  loading: boolean
  onResultClick: (result: SearchResult) => void
  onHover: (index: number) => void
}

function getFileIcon(result: SearchResult) {
  if (result.type === 'folder') {
    return <Folder size={18} color="#f59e0b" />
  }
  const ext = result.extension?.toLowerCase() || ''
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)) {
    return <ImageIcon size={18} color="#db2777" />
  }
  if (['.mp3', '.wav', '.flac', '.aac'].includes(ext)) {
    return <Music size={18} color="#7c3aed" />
  }
  if (['.mp4', '.avi', '.mkv', '.mov'].includes(ext)) {
    return <Video size={18} color="#dc2626" />
  }
  if (['.txt', '.md', '.doc', '.docx', '.pdf'].includes(ext)) {
    return <FileText size={18} color="#2563eb" />
  }
  return <File size={18} color="#666" />
}

const ResultList: React.FC<ResultListProps> = React.memo(({
  results,
  selectedIndex,
  loading,
  onResultClick,
  onHover,
}) => {
  if (loading) {
    return (
      <div className="result-empty">
        <Loader2 className="spin" size={24} />
        <p>正在搜索...</p>
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="result-empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ddd" strokeWidth="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <p>没有找到匹配的文件</p>
      </div>
    )
  }

  return (
    <div className="result-list" role="listbox" aria-label="搜索结果">
      {results.map((result, index) => (
        <div
          key={result.id}
          role="option"
          aria-selected={index === selectedIndex}
          className={`result-item ${index === selectedIndex ? 'selected' : ''}`}
          onClick={() => onResultClick(result)}
          onMouseEnter={() => onHover(index)}
        >
          <div className="result-icon">{getFileIcon(result)}</div>
          <div className="result-info">
            <div className="result-name">{result.name}</div>
            <div className="result-meta">
              <span className="result-path">{result.path}</span>
              {result.type === 'file' && typeof result.size === 'number' && (
                <span className="result-size">{formatSize(result.size)}</span>
              )}
              {result.modifiedDate && (
                <>
                  <Clock size={12} />
                  <span className="result-date">{formatDate(result.modifiedDate)}</span>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
})

ResultList.displayName = 'ResultList'
export default ResultList
