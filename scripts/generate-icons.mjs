import sharp from 'sharp'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const svg = readFileSync(resolve(__dirname, '../public/favicon.svg'))

const sizes = [
  { name: 'apple-touch-icon.png',   size: 180 },
  { name: 'icon-192.png',           size: 192 },
  { name: 'icon-512.png',           size: 512 },
  { name: 'icon-maskable-512.png',  size: 512 },  // same image; manifest marks it maskable
]

for (const { name, size } of sizes) {
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile(resolve(__dirname, `../public/${name}`))
  console.log(`Generated public/${name}`)
}
