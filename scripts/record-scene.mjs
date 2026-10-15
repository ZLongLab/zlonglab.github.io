import { chromium } from '@playwright/test'
import { writeFile, mkdir } from 'node:fs/promises'

await mkdir('qa', { recursive: true })
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' })
  await page.locator('main[data-render-mode="webgl"]').waitFor()
  await page.waitForTimeout(3000)
  const base64 = await page.locator('.cosmic-scene canvas').evaluate(async canvas => {
    const stream = canvas.captureStream(30)
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm;codecs=vp8'
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 3000000 })
    const chunks = []
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data) }
    const finished = new Promise(resolve => { recorder.onstop = resolve })
    recorder.start(1000)
    await new Promise(resolve => setTimeout(resolve, 8000))
    recorder.stop()
    await finished
    stream.getTracks().forEach(track => track.stop())
    const blob = new Blob(chunks, { type: mimeType })
    const reader = new FileReader()
    const result = new Promise(resolve => { reader.onloadend = () => resolve(String(reader.result).split(',')[1]) })
    reader.readAsDataURL(blob)
    return result
  })
  const video = Buffer.from(base64, 'base64')
  await writeFile('qa/digital-space-v3.webm', video)
  console.log(JSON.stringify({ file: 'qa/digital-space-v3.webm', bytes: video.length, duration: '8 seconds', contents: 'Actual WebGL canvas recording; HTML controls are outside the canvas' }))
} finally { await browser.close() }
