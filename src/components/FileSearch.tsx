import React from 'react'
import { Search, X } from 'lucide-react'
import './FileSearch.css'

interface FileSearchProps {
  query: string
  onQueryChange: (query: string) => void
  inputRef: React.RefObject<HTMLInputElement | null>
  onClose: () => void
}

const FileSearch: React.FC<FileSearchProps> = React.memo(({
  query,
  onQueryChange,
  inputRef,
  onClose,
}) => (
    <div className="file-search">
      <div className="search-icon">
        <Search size={20} color="#999" />
      </div>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="搜索文件或路径..."
        className="search-input"
        autoFocus
      />
      {query && (
        <button className="clear-button" onClick={() => onQueryChange('')} aria-label="清空搜索">
          <X size={16} />
        </button>
      )}
      <button className="close-button" onClick={onClose} aria-label="关闭搜索">
        <X size={20} />
      </button>
    </div>
))

FileSearch.displayName = 'FileSearch'
export default FileSearch
