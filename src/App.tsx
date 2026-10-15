import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode, PointerEvent } from 'react'
import { ArrowUpRight, ArrowRight, Github, Pause, Play, FileText, PanelsTopLeft, Orbit, X, RotateCcw } from 'lucide-react'
import { Vector2 } from 'three'
import type { SceneMotion } from './NeuralScene'
import { profile } from './content'

const NeuralScene = lazy(() => import('./NeuralScene'))
function Mark({ core = false }: { core?: boolean }) {
  return <svg className={core ? 'mark core-mark' : 'mark'} viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <path d="M12 15h29L15 46h29M46 15v31h10" stroke="currentColor" strokeWidth={core ? 1.6 : 2.5} strokeLinecap="square" />
    {core && <path d="M5 5h9M5 5v9M59 59h-9M59 59v-9" stroke="currentColor" strokeOpacity=".35" strokeWidth=".8" />}
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
  const [panel, setPanel] = useState<'workspace' | 'playground' | null>(null)
  const [variant, setVariant] = useState<SceneMotion['variant']>('core')
  const [speed, setSpeed] = useState(1)
  const [bloom, setBloom] = useState(1.6)
  const dialog = useRef<HTMLDialogElement>(null)
  const motion = useRef<SceneMotion>({ time: 0.6, pointer: new Vector2(), running: true, visible: true, variant: 'core', speed: 1, bloom: 1.6 }).current
  motion.running = !paused && !reduced
  motion.visible = visible
  motion.variant = variant
  motion.speed = speed
  motion.bloom = bloom
  const ready = useCallback(() => setStatus('webgl'), [])
  const lost = useCallback(() => { setStatus('fallback'); setSupported(false) }, [])
  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (panel && !element.open) element.showModal()
    if (!panel && element.open) element.close()
  }, [panel])
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
  }
  return <main id="home" className={`universe ${motion.running ? '' : 'motion-still'}`} data-render-mode={status} onPointerMove={move} onPointerLeave={() => motion.pointer.set(0, 0)}>
    <a href="#projects" className="skip-link">跳到工具入口</a>
    <div className="cosmic-scene" aria-hidden="true">
      {supported === true && <SceneBoundary onError={lost}><Suspense fallback={null}><NeuralScene motion={motion} mobile={mobile} onReady={ready} onLost={lost} /></Suspense></SceneBoundary>}
      {supported !== true && <div className="scene-fallback" />}
    </div>
    <div className="atmosphere" aria-hidden="true" /><div className="grain" aria-hidden="true" />
    <div className="viewport-frame" aria-hidden="true"><i /><i /><i /><i /></div>
    <header className="lab-header flex items-center justify-between">
      <a className="brand flex items-center gap-3" href="#home" aria-label="ZL AI LAB 首页"><Mark /><span>ZL AI LAB<span className="brand-sub">PERSONAL DIGITAL SPACE</span></span></a>
      <div className="header-controls flex items-center gap-5">
        <span className="scene-status"><i />{status === 'webgl' ? 'NEURAL SPACE' : status === 'fallback' ? 'STILL SPACE' : 'INITIALIZING'}</span>
        <a href={profile.github} target="_blank" rel="noopener noreferrer" className="github-link" aria-label="访问 ZLongLab GitHub 主页"><Github size={16} /><span>GitHub</span><ArrowUpRight size={13} /></a>
      </div>
    </header>
    <div className="hud hud-left" aria-hidden="true">
      <span className="hud-caption">PERSONAL SPACE / 01</span><span className="hud-rule" />
      <svg className="signal-trace" viewBox="0 0 142 38"><path d="M0 25h13l4-6 7 10 8-17 8 21 7-13 7 5h12l7-4 6 6 9-15 8 17 9-8h27" /><path className="trace-scan" d="M0 25h13l4-6 7 10 8-17 8 21 7-13 7 5h12l7-4 6 6 9-15 8 17 9-8h27" /></svg>
      <span className="hud-coordinate">X 00.00 · Y 00.00 · Z ∞</span>
    </div>
    <div className="hud hud-right" aria-hidden="true">
      <span className="hud-caption">INTELLIGENCE / CONNECTED</span>
      <div className="spectrum">{Array.from({ length: 25 }, (_, i) => <i key={i} style={{ height: `${7 + (Math.sin(i * 1.14) + 1) * 11}px`, animationDelay: `${i * -0.12}s` }} />)}</div>
      <span className="hud-coordinate">BUILD · ORGANIZE · EXPLORE</span>
    </div>
    <div className="core-identity" aria-label="ZL AI LAB Logo">
      <div className="core-brackets" aria-hidden="true"><i /><i /><i /><i /></div><Mark core />
      <span className="core-name">ZL</span><span className="core-descriptor">DIGITAL CORE</span>
    </div>
    <div className="orbital-label orbital-label-top" aria-hidden="true"><i /> SYNERGY_01</div>
    <div className="orbital-label orbital-label-bottom" aria-hidden="true">∞ <span>CONTINUOUS EXPLORATION</span></div>
    <div className="lab-content">
      <h1>ZL AI <span>LAB</span></h1>
      <p className="hero-tagline">Building digital tools and intelligent experiences.</p>
      <nav id="projects" className="project-portals" aria-label="工具入口">
        {profile.portals.map(portal => {
          const Icon = portal.id === 'documents' ? FileText : portal.id === 'workspace' ? PanelsTopLeft : Orbit
          const body = <><Icon size={16} strokeWidth={1.5} /><span>{portal.title}</span>{portal.url ? <ArrowUpRight size={14} className="portal-arrow" /> : <ArrowRight size={14} className="portal-arrow" />}</>
          return portal.url ? <a key={portal.id} href={portal.url} className="portal portal-primary" title={portal.description} target="_blank" rel="noopener noreferrer">{body}</a> : <button key={portal.id} type="button" className="portal" title={portal.description} onClick={() => setPanel(portal.id)}>{body}</button>
        })}
      </nav>
    </div>
    <footer className="lab-footer flex items-center justify-between">
      <span className="footer-index"><span>01</span> / DIGITAL UNIVERSE</span>
      <button className="motion-control" type="button" aria-pressed={paused} disabled={reduced || status !== 'webgl'} onClick={() => setPaused(!paused)} aria-label={paused ? '播放场景动画' : '暂停场景动画'}>{paused || reduced ? <Play size={11} /> : <Pause size={11} />}<span>{reduced ? 'REDUCED MOTION' : paused ? 'RESUME MOTION' : 'PAUSE MOTION'}</span></button>
      <span className="footer-signature">ZLongLab <span>© {new Date().getFullYear()}</span></span>
    </footer>
    {status === 'fallback' && <span className="fallback-note" role="status">当前设备显示静态空间模式</span>}
    <dialog ref={dialog} className="space-panel" aria-labelledby="panel-title" onClose={() => setPanel(null)} onCancel={() => setPanel(null)} onClick={event => { if (event.target === event.currentTarget) { const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) setPanel(null) } }}>
      <button className="panel-close" type="button" aria-label="关闭面板" onClick={() => setPanel(null)}><X size={18} /></button>
      <span className="panel-eyebrow">{panel === 'workspace' ? 'YOUR DIGITAL SPACE' : 'REAL-TIME EXPERIMENT'}</span>
      <h2 id="panel-title">{panel === 'workspace' ? 'ZL Workspace' : 'Playground'}</h2>
      <p className="panel-description">{panel === 'workspace' ? 'A personal digital workspace.' : 'Small experiments and prototypes.'}</p>
      {panel === 'workspace' ? <div className="workspace-links">
        <a href={profile.portals[0].url!} target="_blank" rel="noopener noreferrer"><FileText size={19} /><div><strong>DocumentAssistant</strong><span>AI-powered personal knowledge system.</span><small>Document management · Knowledge organization · Intelligent search</small></div><ArrowUpRight size={15} /></a>
        <a href={profile.github} target="_blank" rel="noopener noreferrer"><Github size={19} /><div><strong>GitHub</strong><span>Code and personal resources.</span></div><ArrowUpRight size={15} /></a>
        <button type="button" onClick={() => setPanel('playground')}><Orbit size={19} /><div><strong>Playground</strong><span>Explore the digital space.</span></div><ArrowRight size={15} /></button>
      </div> : <div className="playground-controls">
        <div className="scene-presets" role="group" aria-label="场景实验">
          {(['core', 'flow', 'orbit'] as const).map((value, i) => <button key={value} type="button" aria-pressed={variant === value} onClick={() => setVariant(value)}>{['Neural Core', 'Particle Flow', 'Orbital Field'][i]}</button>)}
        </div>
        <label>Motion <span>{speed.toFixed(1)}×</span><input aria-label="运动速度" type="range" min="0.4" max="2" step="0.1" value={speed} onChange={event => setSpeed(Number(event.target.value))} /></label>
        <label>Bloom <span>{bloom.toFixed(1)}</span><input aria-label="光晕强度" type="range" min="0.6" max="2.5" step="0.1" value={bloom} onChange={event => setBloom(Number(event.target.value))} /></label>
        <button className="reset-scene" type="button" onClick={() => { setVariant('core'); setSpeed(1); setBloom(1.6) }}><RotateCcw size={12} /> Reset experiment</button>
        {reduced && <p className="panel-note">系统已启用减少动态效果，运动保持暂停。</p>}
      </div>}
    </dialog>
  </main>
}
