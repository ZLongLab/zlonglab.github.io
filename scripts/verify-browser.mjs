import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'

await mkdir('qa', { recursive: true })
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })
const checks = []
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  await page.goto(process.env.SITE_URL || 'http://127.0.0.1:5173', { waitUntil: 'networkidle' })
  await page.locator('main[data-render-mode="webgl"]').waitFor()
  const canvas = page.locator('.cosmic-scene canvas')
  const checkLogo = async () => {
    const alignment = await page.evaluate(() => {
      const canvas = document.querySelector('canvas')
      const canvasBox = canvas.getBoundingClientRect()
      const mark = document.querySelector('.core-mark')
      const box = mark.getBoundingClientRect()
      const letters = [...mark.querySelectorAll('path')].map(p => p.getBBox())
      return {
        x: Math.abs(box.x + box.width / 2 - canvasBox.x - Number(canvas.dataset.coreX)),
        y: Math.abs(box.y + box.height / 2 - canvasBox.y - Number(canvas.dataset.coreY)),
        sameWidth: letters[0].width === letters[1].width,
        sameHeight: letters[0].height === letters[1].height,
      }
    })
    assert.ok(alignment.x < 1 && alignment.y < 1, 'Logo must track projected sphere center')
    assert.ok(alignment.sameWidth && alignment.sameHeight, 'Z and L must share width and height')
  }
  await page.waitForTimeout(3500)
  assert.equal(await page.locator('h1').innerText(), 'ZL AI LAB')
  assert.equal(await page.locator('.hero-tagline').innerText(), 'Building digital tools and intelligent experiences.')
  assert.equal(await page.getByText(/Vessel AI|Cloud Lab|AI Desktop Assistant/).count(), 0)
  assert.equal(await canvas.getAttribute('data-bloom'), 'mipmap-hdr')
  assert.ok(Number(await canvas.getAttribute('data-link-count')) > 20)
  assert.equal(await canvas.getAttribute('data-atmosphere'), 'aurora-horizon')
  await checkLogo()
  checks.push('WebGL scene, HDR Bloom, neural links and animated aurora/horizon initialized')

  const animatedA = await canvas.screenshot()
  const pulseA = await canvas.getAttribute('data-core-pulse')
  await page.waitForTimeout(350)
  const animatedB = await canvas.screenshot()
  assert.ok(!animatedA.equals(animatedB), 'Live rendering must advance')
  const revision = Number(await canvas.getAttribute('data-links-revision'))
  await page.waitForFunction(value => Number(document.querySelector('canvas')?.dataset.linksRevision) > value, revision, { timeout: 30000 })
  assert.notEqual(await canvas.getAttribute('data-core-pulse'), pulseA, 'Energy core must visibly breathe over time')
  checks.push('Particles/data streams animate and neural connections change')

  await page.mouse.move(280, 270)
  await page.mouse.move(570, 320, { steps: 18 })
  assert.ok(Number(await canvas.getAttribute('data-trail-particles')) > 5, 'Mouse movement emits a luminous trail')
  await page.screenshot({ path: 'qa/pointer-trail.png' })
  await page.mouse.move(1280, 340)
  await page.waitForTimeout(35)
  assert.ok(Number(await canvas.getAttribute('data-trail-length')) <= 64, 'Fast movement must not create a long trail')
  await page.waitForTimeout(450)
  assert.equal(await canvas.getAttribute('data-trail-particles'), '0', 'Trail expires within 450ms of stopping')
  await page.locator('main').dispatchEvent('pointermove', { pointerType: 'touch', clientX: 320, clientY: 250 })
  await page.waitForTimeout(100)
  assert.equal(await canvas.getAttribute('data-trail-particles'), '0', 'Touch does not emit a mouse trail')
  checks.push('Short tapered mouse trail stays within 64px, expires promptly and ignores touch input')

  await page.mouse.move(100, 400)
  await page.waitForTimeout(1300)
  const cameraA = Number(await canvas.getAttribute('data-camera-x'))
  await page.mouse.move(1300, 400)
  await page.waitForTimeout(1600)
  const cameraB = Number(await canvas.getAttribute('data-camera-x'))
  assert.ok(cameraB - cameraA > 0.08, 'Pointer movement must affect camera parallax')
  await checkLogo()
  checks.push('Smooth camera parallax responds to pointer; equal-sized logo tracks sphere center')

  await page.getByRole('button', { name: '暂停场景动画' }).click()
  await page.mouse.move(1000, 500)
  await page.waitForTimeout(300)
  assert.equal(await page.getByRole('button', { name: '播放场景动画' }).getAttribute('aria-pressed'), 'true')
  assert.equal(await canvas.getAttribute('data-trail-particles'), '0', 'Pausing clears the pointer trail instead of freezing it')
  const frozenA = await canvas.screenshot()
  const freezeInfoA = await canvas.evaluate(el => ({...el.dataset}))
  await page.mouse.move(400, 500)
  await page.waitForTimeout(300)
  const frozenB = await canvas.screenshot()
  if (!frozenA.equals(frozenB)) {
    await writeFile('qa/pause-a.png', frozenA)
    await writeFile('qa/pause-b.png', frozenB)
    console.log(JSON.stringify({ freezeInfoA, freezeInfoB: await canvas.evaluate(el => ({...el.dataset})), state: await page.locator('main').getAttribute('class') }))
  }
  assert.ok(frozenA.equals(frozenB), 'Pause must freeze rendering and camera parallax')
  await page.screenshot({ path: 'qa/desktop-minimal.png', fullPage: true })
  await page.getByRole('button', { name: '播放场景动画' }).click()
  const resumedA = await canvas.screenshot()
  await page.waitForTimeout(350)
  const resumedB = await canvas.screenshot()
  assert.ok(!resumedA.equals(resumedB), 'Resume must restart simulation')
  checks.push('Pause freezes all scene motion; resume restarts it')

  assert.equal(await page.locator('.portal').count(), 1)
  assert.equal(await page.locator('a.portal').getAttribute('href'), 'https://github.com/ZLongLab/DocumentAssistant')
  assert.equal(await page.locator('.github-link').getAttribute('href'), 'https://github.com/ZLongLab')
  assert.equal(await page.getByRole('dialog').count(), 0)
  checks.push('Single DocumentAssistant entrance and direct GitHub link, without redundant panels')

  for (const [width, height] of [[1920,1080],[1440,900],[1024,768],[768,1024],[390,844],[320,640]]) {
    await page.setViewportSize({ width, height })
    await page.waitForTimeout(500)
    const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: innerWidth }))
    assert.ok(dimensions.scroll <= dimensions.viewport, `Horizontal overflow at ${width}px`)
    const heading = await page.locator('h1').boundingBox()
    const portals = await page.locator('#projects').boundingBox()
    const footer = await page.locator('footer').boundingBox()
    assert.ok(heading && portals && footer && heading.y + heading.height < portals.y && portals.y + portals.height < footer.y, `Overlapping UI at ${width}px`)
    assert.equal(await page.locator('main').getAttribute('data-render-mode'), 'webgl')
    await checkLogo()
  }
  checks.push('Responsive layout at 1920/1440/1024/768/390/320px, no horizontal overflow or UI overlap')

  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForTimeout(500)
  await page.getByRole('button', { name: '暂停场景动画' }).click()
  await page.waitForTimeout(200)
  await page.screenshot({ path: 'qa/mobile-minimal.png', fullPage: true })
  await page.getByRole('button', { name: '播放场景动画' }).click()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.waitForTimeout(300)
  const reducedA = await canvas.screenshot()
  await page.waitForTimeout(300)
  const reducedB = await canvas.screenshot()
  assert.ok(reducedA.equals(reducedB), 'Reduced motion must freeze scene')
  assert.ok(await page.locator('.motion-control').isDisabled())
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.waitForTimeout(300)
  assert.ok(await page.locator('.motion-control').isEnabled())
  checks.push('Live reduced-motion preference changes pause and restore animation')

  const contextFallback = await browser.newPage({ reducedMotion: 'reduce' })
  await contextFallback.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (type.startsWith('webgl')) return null
      return original.call(this, type, ...args)
    }
  })
  await contextFallback.goto(process.env.SITE_URL || 'http://127.0.0.1:5173', { waitUntil: 'networkidle' })
  assert.equal(await contextFallback.locator('main').getAttribute('data-render-mode'), 'fallback')
  assert.ok(await contextFallback.getByRole('heading', { name: 'ZL AI LAB' }).isVisible())
  assert.equal(await contextFallback.locator('.portal').count(), 1)
  await contextFallback.close()
  checks.push('WebGL unavailable: visible fallback and usable project navigation')

  await canvas.dispatchEvent('webglcontextlost')
  await page.locator('main[data-render-mode="fallback"]').waitFor()
  assert.ok(await page.locator('a.portal').isVisible())
  checks.push('Lost WebGL context falls back without hiding content')
  assert.deepEqual(errors, [], 'No browser page, console or shader errors')
  checks.push('No browser page, console or shader errors')
  const report = { passed: true, checks }
  await writeFile('qa/results-minimal.json', JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
} finally { await browser.close() }
