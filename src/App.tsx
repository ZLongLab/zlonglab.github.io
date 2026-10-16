import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode, PointerEvent } from 'react'
import { ArrowUpRight, Github, Pause, Play, FileText } from 'lucide-react'
import { Vector2 } from 'three'
import type { SceneMotion } from './NeuralScene'
import { profile } from './content'

const NeuralScene = lazy(() => import('./NeuralScene'))
function Mark() {
  return <svg className="core-mark" viewBox="0 0 100 64" fill="none" aria-hidden="true">
    <path d="M12 12h30L12 52h30" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="miter" />
    <path d="M58 12v40h30" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="miter" />
  </svg>
}
class SceneBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onError() }
  render() { return this.state.failed ? <div className="scene-fallback" aria-hidden="true" /> : this.props.children }
}
export default function App() {
  const [paused, setPaused] = useState(false)
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [mobile, setMobile] = useState(() => innerWidth < 650)
  const [visible, setVisible] = useState(!document.hidden)
  const [status, setStatus] = useState<'loading' | 'webgl' | 'fallback'>('loading')
  const [supported, setSupported] = useState<boolean | null>(null)
  const coreAnchor = useRef<HTMLDivElement>(null)
  const motion = useRef<SceneMotion>({ time: 0.6, pointer: new Vector2(), pointerActive: false, pointerRevision: 0, running: true, visible: true, variant: 'core', speed: 1, bloom: 1.6 }).current
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
    const updateSize = () => setMobile(innerWidth < 650)
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
  return <main id="home" className="universe" data-render-mode={status} onPointerMove={move} onPointerLeave={() => { motion.pointer.set(0, 0); motion.pointerActive = false }}>
    <a href="#projects" className="skip-link">跳到工具入口</a>
    <div className="cosmic-scene" aria-hidden="true">
      {supported === true && <SceneBoundary onError={lost}><Suspense fallback={null}><NeuralScene motion={motion} mobile={mobile} coreAnchor={coreAnchor} onReady={ready} onLost={lost} /></Suspense></SceneBoundary>}
      {supported !== true && <div className="scene-fallback" />}
    </div>
    <div className="atmosphere" aria-hidden="true" /><div className="grain" aria-hidden="true" />
    <header className="lab-header">
      <a href={profile.github} target="_blank" rel="noopener noreferrer" className="github-link" aria-label="访问 ZLongLab GitHub 主页"><Github size={16} /><span>GitHub</span><ArrowUpRight size={13} /></a>
    </header>
    <div ref={coreAnchor} className="core-identity" aria-hidden="true"><Mark /></div>
    <div className="lab-content">
      <h1>ZL AI <span>LAB</span></h1>
      <p className="hero-tagline">Building digital tools and intelligent experiences.</p>
      <nav id="projects" className="project-portals" aria-label="工具入口" tabIndex={-1}>
        <a href={profile.documentAssistant} className="portal" target="_blank" rel="noopener noreferrer"><FileText size={17} strokeWidth={1.5} /><span>DocumentAssistant</span><ArrowUpRight size={15} className="portal-arrow" /></a>
      </nav>
    </div>
    <footer className="lab-footer">
      <span className="footer-signature">© {new Date().getFullYear()} ZLongLab</span>
      <button className="motion-control" type="button" aria-pressed={paused} disabled={reduced || status !== 'webgl'} onClick={() => setPaused(!paused)} aria-label={paused ? '播放场景动画' : '暂停场景动画'} title={reduced ? '系统已启用减少动态效果' : paused ? '播放场景动画' : '暂停场景动画'}>{paused || reduced ? <Play size={14} /> : <Pause size={14} />}</button>
    </footer>
    {status === 'fallback' && <span className="fallback-note" role="status">当前设备显示静态空间模式</span>}
  </main>
}
