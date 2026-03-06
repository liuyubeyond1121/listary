import { app, BrowserWindow, dialog, globalShortcut, ipcMain, Menu, nativeImage, shell, Tray } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import Store from 'electron-store'

let mainWindow: BrowserWindow | null = null
let searchPopup: BrowserWindow | null = null
let tray: Tray | null = null

const store = new Store<{ indexedFolders: string[] }>({
  defaults: {
    indexedFolders: [],
  },
})

const INDEX_PATH = path.join(app.getPath('userData'), 'file-index.json')
const MAX_STORED_FOLDERS = 10
const SEARCH_LIMIT = 50
const SKIPPED_FOLDERS = new Set([
  '.git',
  'node_modules',
  '$Recycle.Bin',
  'System Volume Information',
])

type IndexedEntry = {
  id: string
  name: string
  path: string
  rootPath: string
  type: 'file' | 'folder'
  extension: string | null
  size: number
  modifiedDate: string
}

const indexMap = new Map<string, IndexedEntry>()

function initializeIndexStore() {
  try {
    if (!fs.existsSync(INDEX_PATH)) {
      saveIndexToDisk()
      return
    }

    const raw = fs.readFileSync(INDEX_PATH, 'utf-8')
    if (!raw.trim()) return

    const parsed = JSON.parse(raw) as IndexedEntry[]
    for (const item of parsed) {
      if (!item?.path) continue
      indexMap.set(item.path, item)
    }
  } catch (error) {
    console.error('Failed to load index store:', error)
  }
}

function saveIndexToDisk() {
  const entries = Array.from(indexMap.values())
  fs.writeFileSync(INDEX_PATH, JSON.stringify(entries), 'utf-8')
}

const SEARCH_POPUP_URL_DEV = 'http://localhost:5173/?popup=1'
const SEARCH_POPUP_URL_PROD = `file://${path.join(__dirname, '../index.html')}?popup=1`

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    frame: true,
    show: false,
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('close', (e) => {
    e.preventDefault()
    mainWindow?.hide()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function getSearchPopupUrl() {
  return process.env.NODE_ENV === 'development' ? SEARCH_POPUP_URL_DEV : SEARCH_POPUP_URL_PROD
}

function createSearchPopup() {
  if (searchPopup) {
    searchPopup.show()
    searchPopup.focus()
    return
  }

  searchPopup = new BrowserWindow({
    width: 720,
    height: 520,
    minWidth: 400,
    minHeight: 300,
    frame: false,
    resizable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
  })

  searchPopup.loadURL(getSearchPopupUrl())

  searchPopup.once('ready-to-show', () => {
    searchPopup?.show()
    searchPopup?.focus()
  })

  searchPopup.on('closed', () => {
    searchPopup = null
  })
}

function registerSearchShortcut() {
  const openSearch = () => {
    createSearchPopup()
  }
  globalShortcut.register('CommandOrControl+Space', openSearch)
  globalShortcut.register('CommandOrControl+Shift+Space', openSearch)
}

function createTray() {
  if (tray) return
  // 开发时 __dirname 为 dist/electron，打包后在 app.asar/dist/electron
  const iconPath = path.join(__dirname, '..', '..', 'electron', 'icon.png')
  let icon = nativeImage.createFromPath(iconPath)
  if (icon.isEmpty()) {
    icon = nativeImage.createFromDataURL(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAOklEQVQ4y2P4//8/AyWYiYFCMIw0MDAwMPxnYGD4T6UBVAkexmYYhqFhGIaGYRgahmFoGIahYQAApegDETl2b1AAAAAASUVORK5CYII='
    )
  }
  tray = new Tray(icon)
  tray.setToolTip('文件搜索 - Ctrl+Space 唤出')
  tray.on('click', () => {
    mainWindow?.show()
    mainWindow?.focus()
  })
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: '显示主窗口', click: () => { mainWindow?.show(); mainWindow?.focus() } },
      { label: '退出', click: () => { app.quit() } },
    ])
  )
}

function unregisterSearchShortcut() {
  globalShortcut.unregister('CommandOrControl+Space')
  globalShortcut.unregister('CommandOrControl+Shift+Space')
}

app.whenReady().then(() => {
  initializeIndexStore()
  createWindow()
  createTray()
  registerSearchShortcut()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
      createTray()
    } else {
      mainWindow?.show()
    }
  })
})

app.on('window-all-closed', () => {
  if (searchPopup) searchPopup = null
  mainWindow = null
})

app.on('before-quit', () => {
  unregisterSearchShortcut()
  tray?.destroy()
  tray = null
})

ipcMain.handle('scan-folder', async (_, folderPath: string) => {
  try {
    const resolvedPath = path.resolve(folderPath)
    if (!fs.existsSync(resolvedPath)) {
      return { success: false, error: `Path does not exist: ${resolvedPath}` }
    }

    const files = await scanDirectory(resolvedPath)
    clearIndexedPath(resolvedPath)
    indexFiles(files)
    addIndexedFolder(resolvedPath)
    saveIndexToDisk()

    return { success: true, count: files.length, scannedPath: resolvedPath }
  } catch (error) {
    console.error('Scan error:', error)
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('search-files', async (_, query: string) => {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return []

  try {
    const scored = Array.from(indexMap.values())
      .map((item) => ({
        item,
        score: getMatchScore(item, normalized),
      }))
      .filter((row) => row.score >= 0)
      .sort((a, b) => a.score - b.score || a.item.name.localeCompare(b.item.name, 'zh-CN'))
      .slice(0, SEARCH_LIMIT)
      .map(({ item }) => ({
        id: item.id,
        name: item.name,
        path: item.path,
        type: item.type,
        extension: item.extension ?? undefined,
        size: item.size,
        modifiedDate: item.modifiedDate,
      }))

    return scored
  } catch (error) {
    console.error('Search error:', error)
    return []
  }
})

ipcMain.handle('open-file', async (_, filePath: string) => {
  try {
    const errorMessage = await shell.openPath(filePath)
    if (errorMessage) {
      return { success: false, error: errorMessage }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('show-file-in-folder', async (_, filePath: string) => {
  try {
    shell.showItemInFolder(filePath)
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('get-stats', async () => {
  let totalFiles = 0
  let totalFolders = 0
  let totalSize = 0

  for (const item of indexMap.values()) {
    if (item.type === 'file') {
      totalFiles += 1
      totalSize += item.size
    } else {
      totalFolders += 1
    }
  }

  return { totalFiles, totalFolders, totalSize }
})

ipcMain.handle('clear-index', async () => {
  indexMap.clear()
  store.set('indexedFolders', [])
  saveIndexToDisk()
  return { success: true }
})

ipcMain.handle('browse-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  })

  if (result.canceled || result.filePaths.length === 0) {
    return { success: false, canceled: true }
  }

  return { success: true, path: result.filePaths[0] }
})

ipcMain.handle('get-indexed-folders', async () => {
  return store.get('indexedFolders')
})

ipcMain.handle('hide-search-popup', () => {
  searchPopup?.hide()
})

async function scanDirectory(rootPath: string): Promise<IndexedEntry[]> {
  const files: IndexedEntry[] = []
  const stack = [rootPath]

  while (stack.length > 0) {
    const currentPath = stack.pop()
    if (!currentPath) continue

    try {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name)

        try {
          if (entry.isSymbolicLink()) {
            continue
          }

          if (entry.isDirectory() && shouldSkipDirectory(entry.name)) {
            continue
          }

          const stats = fs.statSync(fullPath)

          if (entry.isDirectory()) {
            files.push({
              id: fullPath,
              name: entry.name,
              path: fullPath,
              rootPath,
              type: 'folder',
              extension: null,
              size: 0,
              modifiedDate: stats.mtime.toISOString(),
            })
            stack.push(fullPath)
          } else if (entry.isFile()) {
            files.push({
              id: fullPath,
              name: entry.name,
              path: fullPath,
              rootPath,
              type: 'file',
              extension: path.extname(entry.name),
              size: stats.size,
              modifiedDate: stats.mtime.toISOString(),
            })
          }
        } catch (error) {
          console.error(`Error processing ${fullPath}:`, error)
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${currentPath}:`, error)
    }
  }

  return files
}

function shouldSkipDirectory(name: string): boolean {
  return name.startsWith('.') || SKIPPED_FOLDERS.has(name)
}

function clearIndexedPath(folderPath: string) {
  const prefix = `${folderPath}${path.sep}`
  const removePaths: string[] = []

  for (const entryPath of indexMap.keys()) {
    if (entryPath === folderPath || entryPath.startsWith(prefix)) {
      removePaths.push(entryPath)
    }
  }

  for (const itemPath of removePaths) {
    indexMap.delete(itemPath)
  }
}

function indexFiles(entries: IndexedEntry[]) {
  for (const file of entries) {
    indexMap.set(file.path, file)
  }
}

function addIndexedFolder(folderPath: string) {
  const current = store.get('indexedFolders')
  const deduped = [folderPath, ...current.filter((item) => item !== folderPath)]
  store.set('indexedFolders', deduped.slice(0, MAX_STORED_FOLDERS))
}

function getMatchScore(item: IndexedEntry, query: string): number {
  const name = item.name.toLowerCase()
  const filePath = item.path.toLowerCase()

  if (name === query) return 0
  if (name.startsWith(query)) return 1
  if (name.includes(query)) return 2
  if (filePath.includes(query)) return 3

  return -1
}
