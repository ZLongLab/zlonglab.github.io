import type { CSSProperties } from 'react'
import { ArrowUpRight, FileText, GitBranch, Github, Sparkles } from 'lucide-react'

export function Waveform({ mini = false }: { mini?: boolean }) {
  const count = mini ? 7 : 40
  return <div className={mini ? 'waveform waveform-mini' : 'waveform'} aria-hidden="true">
    {Array.from({ length: count }, (_, i) => <i key={i} style={{ '--bar-height': `${14 + Math.abs(Math.sin(i * 1.73)) * 74}%`, '--bar-delay': `${-i * .087}s`, '--bar-time': `${.55 + (i % 7) * .13}s` } as CSSProperties} />)}
    {!mini && <div className="wave-core"><i /><i /><i /><span><Sparkles size={17} strokeWidth={1.3} /></span></div>}
  </div>
}

const routes = [
  'M28 26 C75 26 80 43 123 55', 'M28 61 C70 61 90 61 120 61', 'M28 96 C75 96 80 79 123 67',
  'M197 55 C240 43 245 26 292 26', 'M200 61 C230 61 250 61 292 61', 'M197 67 C240 79 245 96 292 96',
]
const nodes = [[28,26],[28,61],[28,96],[292,26],[292,61],[292,96],[124,42],[160,22],[196,42],[196,80],[160,100],[124,80],[160,61]]
function NetworkGraph() {
  return <svg className="network-graph" viewBox="0 0 320 122" fill="none" aria-hidden="true">
    <defs><linearGradient id="network-tint"><stop stopColor="#00f5ff" /><stop offset="1" stopColor="#a075ff" /></linearGradient></defs>
    {routes.map((path, i) => <g key={path}><path className="network-route" d={path} /><path className="network-flow" d={path} style={{ '--flow-delay': `${i * -.31}s` } as CSSProperties} /></g>)}
    <path className="network-mesh" d="M124 42 160 22 196 42 196 80 160 100 124 80Z M124 42 196 80 M196 42 124 80 M160 22 160 100 M124 42 160 61 196 42 M124 80 160 61 196 80" />
    {nodes.map(([cx, cy], i) => <circle key={i} className="network-node" cx={cx} cy={cy} r={i < 6 ? 3 : 2} style={{ '--node-delay': `${i * -.23}s` } as CSSProperties} />)}
    <g className="branch-labels"><text x="7" y="16">BRANCH</text><text x="272" y="16">BRANCH</text></g>
  </svg>
}

export function HoloCard({ gateway, href }: { gateway?: boolean; href: string }) {
  return <a className={`holo-card ${gateway ? 'gateway-card' : 'document-card'}`} href={href} target="_blank" rel="noopener noreferrer" aria-label={gateway ? 'GitHub Gateway，打开 ZLongLab GitHub 主页' : 'DocumentAssistant，打开项目仓库'}>
    <div className="card-top"><span className="card-icon">{gateway ? <><Github size={20} strokeWidth={1.4} /><GitBranch size={13} /></> : <><FileText size={21} strokeWidth={1.4} /><Sparkles size={12} /></>}</span><span className="card-number">{gateway ? '02' : '01'}</span></div>
    <h2><span className="card-index">{gateway ? '02' : '01'} //</span> {gateway ? 'GitHub Gateway' : 'DocumentAssistant'}<ArrowUpRight className="card-arrow" size={17} /></h2>
    <div className="card-visual">{gateway ? <NetworkGraph /> : <Waveform />}</div>
    <div className="card-bottom"><span className="tech-pill">{gateway ? 'GIT • REPO • OPEN' : 'AI • RAG • SYSTEM'}</span><span className="card-active"><i /> ACTIVE</span></div>
    <span className="card-ticks" aria-hidden="true" />
  </a>
}
