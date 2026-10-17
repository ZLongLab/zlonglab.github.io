import { useEffect, useRef } from 'react'

export default function Telemetry({ running, mode, linked }: { running: boolean; mode: string; linked: string | null }) {
  const values = useRef<HTMLDivElement>(null)
  const elapsed = useRef(0)
  useEffect(() => {
    if (!running) return
    const timer = window.setInterval(() => {
      elapsed.current += .12
      const t = elapsed.current
      const numbers = [-3.5 + Math.sin(t*.7)*.16, 3.09 + Math.sin(t*.9)*.08, .05 + Math.sin(t*.43)*.005]
      values.current?.querySelectorAll<HTMLElement>('[data-reading]').forEach((element, index) => {
        element.textContent = numbers[index].toFixed(index === 2 ? 3 : 2)
      })
    }, 120)
    return () => clearInterval(timer)
  }, [running])
  return <div ref={values} className="telemetry" aria-label="模拟传感器遥测，仅用于视觉效果">
    <div className="telemetry-label telemetry-rpm"><span>ROTATIONAL SYNC</span><strong><b data-reading>-3.50</b><small>% RPM</small></strong><i className="telemetry-rule" /></div>
    <div className="telemetry-label telemetry-flux"><span>NEURAL FLUX</span><strong><b data-reading>3.09</b><small>%</small></strong><div className="tiny-spectrum" aria-hidden="true">{Array.from({length:12},(_,i)=><i key={i} style={{ animationDelay:`${i*-.17}s` }} />)}</div></div>
    <div className="telemetry-label telemetry-velocity"><span>ANGULAR VELOCITY</span><strong><b data-reading>0.050</b><small>rad/s</small></strong><i className="telemetry-rule" /></div>
    <div className="core-caption"><i /> {linked ? 'UPLINK / '+(linked==='document'?'DOCUMENT ASSISTANT':'GITHUB GATEWAY') : 'QUANTUM NEURAL CORE'}<span>{mode.toUpperCase()} / TELEMETRY SIM</span></div>
  </div>
}
