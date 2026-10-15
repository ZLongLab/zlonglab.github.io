import { mkdir, writeFile } from 'node:fs/promises'

const points = Array.from({ length: 210 }, (_, i) => {
  const y = 1 - i / 209 * 2
  const r = Math.sqrt(1 - y * y)
  const angle = i * Math.PI * (3 - Math.sqrt(5))
  return { x: Math.cos(angle) * r * 185 + 600, y: y * 185 + 235, z: Math.sin(angle) * r }
})
const lines = points.flatMap((p, i) => points.slice(i + 1).filter(q => Math.hypot(p.x - q.x, p.y - q.y, (p.z - q.z) * 185) < 54).map(q => `<path d="M${p.x.toFixed(1)} ${p.y.toFixed(1)}L${q.x.toFixed(1)} ${q.y.toFixed(1)}"/>`)).join('')
const dots = points.map(p => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${p.z > 0 ? 1.4 : .8}" opacity="${p.z > 0 ? .65 : .24}"/>`).join('')
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="470" viewBox="0 0 1200 470" role="img" aria-label="ZL AI LAB">
<defs><radialGradient id="glow"><stop stop-color="#162c4a" stop-opacity=".6"/><stop offset="1" stop-color="#020617"/></radialGradient></defs>
<rect width="1200" height="470" rx="8" fill="#020617"/><rect width="1200" height="470" rx="8" fill="url(#glow)"/>
<g stroke="#7B61FF" stroke-width=".5" opacity=".2">${lines}</g><g fill="#00F5FF">${dots}</g>
<g font-family="Arial, sans-serif" text-anchor="middle"><text x="600" y="85" font-size="10" letter-spacing="4" fill="#8ba4bf">PERSONAL DIGITAL SPACE</text>
<path d="M575 138h32l-29 34h32m6-34v34h11" fill="none" stroke="#00F5FF" stroke-width="3"/>
<text x="600" y="280" font-size="88" letter-spacing="-6" fill="#edf2ef">ZL AI LAB<tspan fill="#91eed0">.</tspan></text>
<text x="600" y="327" font-size="16" letter-spacing="1" fill="#a5bacc">Building digital tools and intelligent experiences.</text>
<text x="600" y="410" font-size="10" letter-spacing="3" fill="#859fba">BUILD / ORGANIZE / EXPLORE</text></g>
<path d="M44 44h13m-13 0v13m1112 369h-13m13 0v-13" fill="none" stroke="#426050"/>
</svg>`
await mkdir('github-profile/assets', { recursive: true })
await writeFile('github-profile/assets/lab-banner.svg', svg)
