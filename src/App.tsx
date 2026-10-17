import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode, PointerEvent } from 'react'
import { ArrowUpRight, Github, Pause, Play } from 'lucide-react'
import { Vector2 } from 'three'
import type { SceneMotion } from './NeuralScene'
import { profile } from './content'
import { HoloCard, Waveform } from './HoloCard'
import Telemetry from './Telemetry'
import { LinkBridge } from './LinkBridge'

const NeuralScene = lazy(() => import('./NeuralScene'))
class SceneBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onError() }
  render() { return this.state.failed ? null : this.props.children }
}
function BrandMark() {
  return <span className="brand-orbit"><svg viewBox="0 0 100 64" fill="none" aria-hidden="true"><path d="M12 12h30L12 52h30M58 12v40h30" stroke="currentColor" strokeWidth="3" /></svg></span>
}
export default function App() {
  const [paused, setPaused] = useState(false)
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [mobile, setMobile] = useState(() => innerWidth < 768)
  const [visible, setVisible] = useState(!document.hidden)
  const [status, setStatus] = useState<'loading' | 'webgl' | 'fallback'>('loading')
  const [supported, setSupported] = useState<boolean | null>(null)
  const [mode, setMode] = useState<SceneMotion['variant']>('core')
  const [focus, setFocus] = useState<'document' | 'github' | null>(null)
  const [dragging, setDragging] = useState(false)
  const hero = useRef<HTMLDivElement>(null)
  const sceneAnchor = useRef<HTMLElement>(null)
  const drag = useRef({ active: false, x: 0, y: 0, moved: false })
  const motion = useRef<SceneMotion>({ time: .6, pointer: new Vector2(), corePointer: new Vector2(), proximity: 0, drag: new Vector2(), pulseAt: -100, link: null, pointerActive: false, pointerRevision: 0, running: true, visible: true, variant: 'core', speed: 1, bloom: 1.15 }).current
  motion.running = !paused && !reduced
  motion.visible = visible
  motion.variant = focus === 'document' ? 'flow' : focus === 'github' ? 'network' : mode
  motion.link = focus
  const ready = useCallback(() => setStatus('webgl'), [])
  const lost = useCallback(() => { setStatus('fallback'); setSupported(false) }, [])
  useEffect(() => {
    const probe = document.createElement('canvas')
    try {
      const context = probe.getContext('webgl2')
      if (!context) { setSupported(false); setStatus('fallback') }
      else { context.getExtension('WEBGL_lose_context')?.loseContext(); setSupported(true) }
    } catch { setSupported(false); setStatus('fallback') }
    const preference = matchMedia('(prefers-reduced-motion: reduce)')
    const updatePreference = () => setReduced(preference.matches)
    const updateSize = () => setMobile(innerWidth < 768)
    const updateVisible = () => setVisible(!document.hidden)
    preference.addEventListener('change', updatePreference)
    window.addEventListener('resize', updateSize)
    document.addEventListener('visibilitychange', updateVisible)
    return () => { preference.removeEventListener('change', updatePreference); window.removeEventListener('resize', updateSize); document.removeEventListener('visibilitychange', updateVisible) }
  }, [])
  const move = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'mouse' || !motion.running) return
    const bounds = event.currentTarget.getBoundingClientRect()
    motion.pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1)
    motion.pointerActive = true
    motion.pointerRevision++
    const stage = sceneAnchor.current?.getBoundingClientRect()
    if (stage) {
      motion.corePointer.set((event.clientX-stage.left)/stage.width*2-1, 1-(event.clientY-stage.top)/stage.height*2)
      motion.proximity = Math.max(0, 1-motion.corePointer.length()*1.8)
    }
  }
  const pulse = () => { if (motion.running && !drag.current.moved) motion.pulseAt = motion.time }
  const startDrag = (event: PointerEvent<HTMLButtonElement>) => {
    drag.current.moved = false
    if (!motion.running || event.pointerType !== 'mouse' || event.button !== 0) return
    drag.current = { active: true, x: event.clientX, y: event.clientY, moved: false }
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragging(true)
  }
  const rotate = (event: PointerEvent<HTMLButtonElement>) => {
    if (!drag.current.active || !motion.running) return
    const dx = event.clientX-drag.current.x, dy = event.clientY-drag.current.y
    if (Math.abs(dx)+Math.abs(dy)>2) drag.current.moved = true
    motion.drag.x += dx*.006
    motion.drag.y = Math.max(-.65, Math.min(.65, motion.drag.y+dy*.004))
    drag.current.x = event.clientX; drag.current.y = event.clientY
  }
  const stopDrag = () => { drag.current.active = false; setDragging(false) }
  const running = motion.running && visible
  return <main id="home" className={`universe ${running ? '' : 'motion-still'}`} data-render-mode={status} data-linked={focus || 'idle'} data-mode={motion.variant} onPointerMove={move} onPointerLeave={() => { motion.pointer.set(0, 0); motion.pointerActive = false; motion.proximity = 0 }}>
    <a href="#projects" className="skip-link">跳到工具入口</a>
    <div className="cosmic-scene" aria-hidden="true">
      {supported === true && <SceneBoundary onError={lost}><Suspense fallback={null}><NeuralScene motion={motion} mobile={mobile} sceneAnchor={sceneAnchor} onReady={ready} onLost={lost} /></Suspense></SceneBoundary>}
    </div>
    <div className="space-shade" aria-hidden="true" />
    <div className="upper-beam" aria-hidden="true" />
    <div className="perspective-floor" aria-hidden="true"><div className="floor-grid" /></div>
    <div className="coordinate-rail rail-left" aria-hidden="true">0101<br />0010<br />1100<br />0101<br />1001<br />0011</div>
    <div className="coordinate-rail rail-right" aria-hidden="true">+ 0.002<br />+ 1.094<br />+ 0.128</div>
    <header className="lab-header">
      <a className="brand" href="#home" aria-label="ZL AI LAB 首页"><BrandMark /><span>ZL AI <em>LAB</em></span></a>
      <div className="header-right"><span className="system-status"><i />[ SYS.ACTIVE ]</span><a href={profile.github} target="_blank" rel="noopener noreferrer" className="github-link"><Github size={15} /><span>GitHub</span><ArrowUpRight size={14} /></a></div>
    </header>
    <div className="hero-grid" ref={hero}>
      <LinkBridge hero={hero} stage={sceneAnchor} active={focus} />
      <section className="command-column" aria-labelledby="hero-title">
        <div className="terminal-eyebrow"><span /> PERSONAL NEURAL INTERFACE <span className="eyebrow-end">/ 001</span></div>
        <h1 id="hero-title">ZL AI <span>LAB</span></h1>
        <p className="hero-tagline">Building digital tools and intelligent experiences.</p>
        <div className="security-status">[SEC_ID: 2026 <span>//</span> STATUS: OK]</div>
        <nav id="projects" className="command-cards" aria-label="工具入口" tabIndex={-1}>
          <HoloCard href={profile.documentAssistant} onActivate={() => setFocus('document')} onDeactivate={() => setFocus(null)} />
          <HoloCard gateway href={profile.github} onActivate={() => setFocus('github')} onDeactivate={() => setFocus(null)} />
        </nav>
      </section>
      <section ref={sceneAnchor} className="orbital-stage" aria-label="动态量子神经核心">
        <div className="stage-reticle" aria-hidden="true"><i /><i /><i /><i /></div>
        <svg className="orbital-hud" viewBox="0 0 600 600" fill="none" aria-hidden="true">
          <g className="hud-dial">{Array.from({length:72},(_,i)=><path key={i} d={`M300 ${i%6===0?34:40}V47`} transform={`rotate(${i*5} 300 300)`} className={i%6===0?'hud-major':''} />)}<circle cx="300" cy="300" r="256" strokeDasharray="90 80 2 25" /></g>
          <path className="hud-track" d="M70 195A255 255 0 0 1 195 70 M405 530A255 255 0 0 0 530 405" />
          <path className="hud-cross" d="M285 300H315 M300 285V315" />
        </svg>
        <button className={`core-touch-zone ${dragging?'is-dragging':''}`} type="button" onPointerDown={startDrag} onPointerMove={rotate} onPointerUp={stopDrag} onPointerCancel={stopDrag} onLostPointerCapture={stopDrag} onClick={event => { if(event.detail===0) drag.current.moved=false; pulse() }} disabled={!running || status!=='webgl'} aria-label="点击核心释放能量波，鼠标拖动旋转" title="点击释放能量波 · 拖动旋转"><span className="interaction-hint">DRAG TO ROTATE <i /> CLICK TO PULSE</span></button>
        {(status === 'fallback' || status === 'loading') && <div className="scene-fallback" aria-hidden="true"><i /><i /><i /></div>}
        <Telemetry running={running} mode={motion.variant} linked={focus} />
        <div className="scene-modes" role="group" aria-label="核心视觉模式">{(['core','network','flow'] as const).map(value=><button key={value} type="button" aria-pressed={motion.variant===value} onClick={() => { setMode(value); setFocus(null); motion.pulseAt=motion.time }} disabled={!running || status!=='webgl'}><i />{value.toUpperCase()}</button>)}</div>
        {status === 'fallback' && <span className="fallback-note" role="status">静态空间模式</span>}
      </section>
    </div>
    <footer className="lab-footer">
      <span className="footer-signature">© 2026 ZLongLab</span>
      <div className="footer-line" aria-hidden="true"><i /></div>
      <button className="motion-control" type="button" aria-pressed={paused} disabled={reduced} onClick={() => setPaused(!paused)} aria-label={paused ? '播放场景动画' : '暂停场景动画'} title={reduced ? '系统已启用减少动态效果' : '切换全部视觉动效'}><Waveform mini /><span>{reduced ? 'REDUCED' : paused ? 'MOTION OFF' : 'MOTION ON'}</span>{paused || reduced ? <Play size={12} /> : <Pause size={12} />}</button>
    </footer>
  </main>
}
