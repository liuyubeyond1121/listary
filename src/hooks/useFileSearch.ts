import { useCallback, useEffect, useRef, useState } from 'react'
import { SearchResult } from '../types'

const DEBOUNCE_MS = 200

export const useFileSearch = () => {
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requestIdRef = useRef(0)

  const searchFiles = useCallback(async (query: string) => {
    const normalized = query.trim()
    if (!normalized) {
      setResults([])
      setLoading(false)
      return
    }

    const currentId = ++requestIdRef.current
    setLoading(true)

    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const searchResults = await window.electronAPI.searchFiles(normalized)
        if (currentId === requestIdRef.current) {
          setResults(searchResults)
        }
      } else if (currentId === requestIdRef.current) {
        setResults([])
      }
    } catch (error) {
      if (currentId === requestIdRef.current) {
        console.error('Search error:', error)
        setResults([])
      }
    } finally {
      if (currentId === requestIdRef.current) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const debouncedSearch = useCallback((query: string) => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    const trimmed = query.trim()
    if (!trimmed) {
      setResults([])
      setLoading(false)
      return
    }
    // Collapse old results immediately while waiting for the next query response.
    setResults([])
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null
      searchFiles(query)
    }, DEBOUNCE_MS)
  }, [searchFiles])

  return {
    results,
    loading,
    debouncedSearch,
  }
}

