import { useEffect, useState } from 'react'
import type { RefObject } from 'react'

type Props = { hero: RefObject<HTMLDivElement | null>; stage: RefObject<HTMLElement | null>; active: 'document' | 'github' | null }

/** Anchor the data ribbon to real layout bounds, including the mobile stack. */
export function LinkBridge({ hero, stage, active }: Props) {
  const [layout, setLayout] = useState({ width: 1, height: 1, paths: ['', ''] })
  useEffect(() => {
    const host = hero.current, target = stage.current
    if (!host || !target) return
    const update = () => {
      const box = host.getBoundingClientRect(), core = target.getBoundingClientRect()
      const x = core.left-box.left+core.width*.5, y = core.top-box.top+core.height*.5
      const stacked = core.top >= host.querySelector('.command-column')!.getBoundingClientRect().bottom
      const paths = [...host.querySelectorAll('.holo-card')].map(card => {
        const b = card.getBoundingClientRect()
        const sx = (stacked ? b.left+b.width*.8 : b.right)-box.left, sy = (stacked ? b.bottom : b.top+b.height*.5)-box.top
        return stacked ? `M${sx} ${sy}C${sx+20} ${sy+50},${x+100} ${y-100},${x} ${y}` : `M${sx} ${sy}C${sx+100} ${sy},${x-180} ${y},${x} ${y}`
      })
      setLayout({ width: box.width, height: box.height, paths })
    }
    const observer = new ResizeObserver(update)
    observer.observe(host); observer.observe(target)
    host.querySelectorAll('.holo-card').forEach(card => observer.observe(card))
    update()
    return () => observer.disconnect()
  }, [hero, stage])
  return <svg className={`link-bridge ${active ? 'is-linked' : ''}`} viewBox={`0 0 ${layout.width} ${layout.height}`} aria-hidden="true" fill="none">
    <defs><linearGradient id="bridge-tint"><stop stopColor="#00eaff" stopOpacity=".3" /><stop offset="1" stopColor="#b28cff" /></linearGradient></defs>
    {layout.paths.map((path, i) => <g key={i} className={active===(i?'github':'document')?'bridge-active':''}><path className="bridge-track" d={path} /><path className="bridge-packet" d={path} /><path className="bridge-packet bridge-echo" d={path} /></g>)}
  </svg>
}
