// public/favicon.svg로 PWA·iOS 아이콘 PNG를 만든다: npm run icons
import sharp from 'sharp'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const out = (name) => resolve(__dirname, `../public/${name}`)
const svg = readFileSync(resolve(__dirname, '../public/favicon.svg'), 'utf8')

// iOS와 maskable 아이콘은 모서리를 시스템이 직접 깎으므로 둥근 모서리 없이 꽉 채운 판을 쓴다
const square = Buffer.from(svg.replace('rx="14"', 'rx="0"'))
const rounded = Buffer.from(svg)

const jobs = [
  { name: 'apple-touch-icon.png', size: 180, src: square },
  { name: 'icon-192.png', size: 192, src: rounded },
  { name: 'icon-512.png', size: 512, src: rounded },
]

for (const { name, size, src } of jobs) {
  await sharp(src, { density: 384 }).resize(size, size).png().toFile(out(name))
  console.log(`public/${name}`)
}

// maskable: 안전 영역(가운데 80%) 안에 그림을 두고 바깥은 배경색으로 채운다
const inner = await sharp(square, { density: 384 }).resize(410, 410).png().toBuffer()
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#b5533c' } })
  .composite([{ input: inner, gravity: 'center' }])
  .png()
  .toFile(out('icon-maskable-512.png'))
console.log('public/icon-maskable-512.png')
