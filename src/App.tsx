import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode, PointerEvent } from 'react'
import { ArrowUpRight, Github, Pause, Play } from 'lucide-react'
import { Vector2 } from 'three'
import type { SceneMotion } from './NeuralScene'
import { profile } from './content'
import { HoloCard, Waveform } from './HoloCard'
import Telemetry from './Telemetry'

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
  const sceneAnchor = useRef<HTMLElement>(null)
  const motion = useRef<SceneMotion>({ time: .6, pointer: new Vector2(), pointerActive: false, pointerRevision: 0, running: true, visible: true, variant: 'core', speed: 1, bloom: 1.15 }).current
  motion.running = !paused && !reduced
  motion.visible = visible
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
  }
  const running = motion.running && visible
  return <main id="home" className={`universe ${running ? '' : 'motion-still'}`} data-render-mode={status} onPointerMove={move} onPointerLeave={() => { motion.pointer.set(0, 0); motion.pointerActive = false }}>
    <a href="#projects" className="skip-link">跳到工具入口</a>
    <div className="cosmic-scene" aria-hidden="true">
      {supported === true && <SceneBoundary onError={lost}><Suspense fallback={null}><NeuralScene motion={motion} mobile={mobile} sceneAnchor={sceneAnchor} onReady={ready} onLost={lost} /></Suspense></SceneBoundary>}
    </div>
    <div className="space-shade" aria-hidden="true" />
    <div className="perspective-floor" aria-hidden="true"><div className="floor-grid" /></div>
    <div className="coordinate-rail rail-left" aria-hidden="true">0101<br />0010<br />1100<br />0101<br />1001<br />0011</div>
    <div className="coordinate-rail rail-right" aria-hidden="true">+ 0.002<br />+ 1.094<br />+ 0.128</div>
    <header className="lab-header">
      <a className="brand" href="#home" aria-label="ZL AI LAB 首页"><BrandMark /><span>ZL AI <em>LAB</em></span></a>
      <div className="header-right"><span className="system-status"><i />[ SYS.ACTIVE ]</span><a href={profile.github} target="_blank" rel="noopener noreferrer" className="github-link"><Github size={15} /><span>GitHub</span><ArrowUpRight size={14} /></a></div>
    </header>
    <div className="hero-grid">
      <section className="command-column" aria-labelledby="hero-title">
        <div className="terminal-eyebrow"><span /> PERSONAL NEURAL INTERFACE <span className="eyebrow-end">/ 001</span></div>
        <h1 id="hero-title">ZL AI <span>LAB</span></h1>
        <p className="hero-tagline">Building digital tools and intelligent experiences.</p>
        <div className="security-status">[SEC_ID: 2026 <span>//</span> STATUS: OK]</div>
        <nav id="projects" className="command-cards" aria-label="工具入口" tabIndex={-1}>
          <HoloCard href={profile.documentAssistant} />
          <HoloCard gateway href={profile.github} />
        </nav>
      </section>
      <section ref={sceneAnchor} className="orbital-stage" aria-label="动态量子神经核心">
        <div className="stage-reticle" aria-hidden="true"><i /><i /><i /><i /></div>
        {(status === 'fallback' || status === 'loading') && <div className="scene-fallback" aria-hidden="true"><i /><i /><i /></div>}
        <Telemetry running={running} />
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
