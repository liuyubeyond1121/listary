/**
 * 若 electron/icon.png 不存在则生成（16x16 托盘图标）
 * 可单独运行: node scripts/ensure-tray-icon.js
 */
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const outPath = path.join(root, 'electron', 'icon.png')

if (fs.existsSync(outPath)) {
  console.log('electron/icon.png already exists, skip.')
  process.exit(0)
}

// 16x16 灰色圆角方块，用作托盘图标占位
const base64 =
  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAOklEQVQ4y2P4//8/AyWYiYFCMIw0MDAwMPxnYGD4T6UBVAkexmYYhqFhGIaGYRgahmFoGIahYQAApegDETl2b1AAAAAASUVORK5CYII='

fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, Buffer.from(base64, 'base64'))
console.log('Created electron/icon.png')
