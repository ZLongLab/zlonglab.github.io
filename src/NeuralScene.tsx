import { useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import * as THREE from 'three'

export type SceneMotion = { time: number; pointer: THREE.Vector2; running: boolean; visible: boolean; variant: 'core' | 'flow' | 'orbit'; speed: number; bloom: number }

// Seeded randomness keeps geometry stable through React remounts.
function random(seed: number) {
  let value = seed >>> 0
  return () => { value = (Math.imul(1664525, value) + 1013904223) >>> 0; return value / 4294967296 }
}
const cyan = new THREE.Color('#00F5FF')
const violet = new THREE.Color('#7B61FF')
const pointVertex = `
uniform float uTime;
uniform float uScale;
uniform float uDrift;
attribute float aSize;
attribute float aPhase;
attribute vec3 aColor;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec3 p = position;
  p.x += sin(uTime * 0.36 + aPhase) * (0.075 + uDrift * 0.25);
  p.y += cos(uTime * 0.29 + aPhase * 1.3) * (0.075 + uDrift * 0.3);
  if (uDrift > 0.0) p.z += mod(uTime * uDrift + aPhase * 2.0, 8.0) - 4.0;
  vec4 view = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * view;
  gl_PointSize = clamp(aSize * uScale / max(1.0, -view.z), 1.0, 20.0);
  vColor = aColor;
  vAlpha = 0.65 + sin(uTime * 0.85 + aPhase) * 0.25;
}`
const pointFragment = `
varying vec3 vColor;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  if (d > 1.0) discard;
  float glow = exp(-d * d * 6.0);
  gl_FragColor = vec4(vColor, glow * vAlpha);
}`

function PointField({ foreground, middle = false, motion, mobile }: { foreground: boolean; middle?: boolean; motion: SceneMotion; mobile: boolean }) {
  const group = useRef<THREE.Points>(null!)
  const material = useRef<THREE.ShaderMaterial>(null!)
  const data = useMemo(() => {
    const rand = random(foreground ? 922 : middle ? 224 : 731)
    const count = foreground ? (mobile ? 100 : 220) : middle ? (mobile ? 420 : 850) : (mobile ? 1700 : 3400)
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const phases = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      positions.set([(rand() - 0.5) * (foreground ? 22 : middle ? 32 : 60), (rand() - 0.5) * (foreground ? 14 : middle ? 20 : 36), foreground ? 1 + rand() * 2.8 : middle ? -3 - rand() * 10 : -16 - rand() * 30], i * 3)
      const color = cyan.clone().lerp(violet, rand()).lerp(new THREE.Color('#c5e8ff'), rand() * 0.55).multiplyScalar(foreground ? 1.9 : middle ? 1.25 : 0.9)
      colors.set(color.toArray(), i * 3)
      sizes[i] = foreground ? 0.07 + rand() * 0.17 : 0.04 + rand() * 0.14
      phases[i] = rand() * Math.PI * 2
    }
    return { positions, colors, sizes, phases }
  }, [foreground, middle, mobile])
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uScale: { value: foreground ? 175 : 210 }, uDrift: { value: foreground ? 0.6 : middle ? 0.19 : 0.04 } }), [foreground, middle])
  useFrame(() => {
    material.current.uniforms.uTime.value = motion.time
    group.current.rotation.z = Math.sin(motion.time * (foreground ? 0.075 : middle ? 0.035 : 0.015)) * 0.05
    group.current.position.y = Math.sin(motion.time * 0.17) * (foreground ? 0.5 : middle ? 0.2 : 0.1)
  })
  return <points ref={group} frustumCulled={false} renderOrder={foreground ? 6 : -4}>
    <bufferGeometry>
      <bufferAttribute attach="attributes-position" args={[data.positions, 3]} />
      <bufferAttribute attach="attributes-aColor" args={[data.colors, 3]} />
      <bufferAttribute attach="attributes-aSize" args={[data.sizes, 1]} />
      <bufferAttribute attach="attributes-aPhase" args={[data.phases, 1]} />
    </bufferGeometry>
    <shaderMaterial ref={material} uniforms={uniforms} vertexShader={pointVertex} fragmentShader={pointFragment} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
  </points>
}

const coreVertex = `
uniform float uTime;
varying vec3 vNormal;
varying vec3 vView;
varying vec3 vPosition;
void main() {
  vec3 p = position;
  float displacement = sin(p.y * 9.0 + uTime * 1.3) * sin(p.x * 7.0 - uTime * 0.8) * 0.05;
  p += normal * displacement;
  vec4 view = modelViewMatrix * vec4(p, 1.0);
  vNormal = normalize(normalMatrix * normal);
  vView = -view.xyz;
  vPosition = p;
  gl_Position = projectionMatrix * view;
}`
const coreFragment = `
uniform float uTime;
varying vec3 vNormal;
varying vec3 vView;
varying vec3 vPosition;
void main() {
  float facing = max(dot(normalize(vNormal), normalize(vView)), 0.0);
  float rim = pow(1.0 - facing, 3.2);
  vec3 cyan = vec3(0.0, 0.96, 1.0);
  vec3 purple = vec3(0.39, 0.2, 1.0);
  float gradient = smoothstep(-1.2, 1.2, vPosition.x + vPosition.y * 0.5 + sin(uTime * 0.5) * 0.35);
  vec3 tint = mix(purple, cyan, gradient);
  float angle = atan(vPosition.z, vPosition.x);
  float contour = pow(0.5 + 0.5 * sin(vPosition.y * 26.0 + angle * 3.0 - uTime * 2.5), 22.0);
  float flux = 0.85 + 0.35 * sin(vPosition.y * 8.0 + uTime * 1.4);
  vec3 color = vec3(0.002, 0.005, 0.015) + tint * rim * 2.8 * flux;
  color += tint * contour * (0.09 + rim * 0.5);
  gl_FragColor = vec4(color, 0.72);
}`

function EnergyCore({ motion }: { motion: SceneMotion }) {
  const root = useRef<THREE.Group>(null!)
  const shader = useRef<THREE.ShaderMaterial>(null!)
  const cloud = useRef<THREE.Points>(null!)
  const cloudShader = useRef<THREE.ShaderMaterial>(null!)
  const data = useMemo(() => {
    const rand = random(119)
    const count = 2400
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const phases = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const z = 1 - (2 * i) / (count - 1)
      const r = Math.sqrt(1 - z * z)
      const theta = i * Math.PI * (3 - Math.sqrt(5))
      const shell = 1.6 + rand() * 0.11
      positions.set([Math.cos(theta) * r * shell, z * shell, Math.sin(theta) * r * shell], i * 3)
      const color = violet.clone().lerp(cyan, (Math.cos(theta) * r + 1) * 0.5).multiplyScalar(1.2 + rand() * 1.8)
      colors.set(color.toArray(), i * 3)
      sizes[i] = 0.018 + rand() * 0.032
      phases[i] = rand() * 6.28
    }
    return { positions, colors, sizes, phases }
  }, [])
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), [])
  const cloudUniforms = useMemo(() => ({ uTime: { value: 0 }, uScale: { value: 550 } }), [])
  useFrame(() => {
    shader.current.uniforms.uTime.value = motion.time
    cloudShader.current.uniforms.uTime.value = motion.time
    cloud.current.rotation.y = motion.time * 0.2
    cloud.current.rotation.z = Math.sin(motion.time * 0.22) * 0.18
    root.current.rotation.y = motion.time * 0.09
    root.current.rotation.x = Math.sin(motion.time * 0.2) * 0.1
    root.current.scale.setScalar(1 + Math.sin(motion.time * 0.85) * 0.055)
  })
  return <group ref={root}>
    <mesh renderOrder={0}>
      <sphereGeometry args={[1.52, 72, 56]} />
      <shaderMaterial ref={shader} uniforms={uniforms} vertexShader={coreVertex} fragmentShader={coreFragment} transparent depthWrite={false} toneMapped={false} />
    </mesh>
    <points ref={cloud} renderOrder={2}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.positions, 3]} />
        <bufferAttribute attach="attributes-aColor" args={[data.colors, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[data.sizes, 1]} />
        <bufferAttribute attach="attributes-aPhase" args={[data.phases, 1]} />
      </bufferGeometry>
      <shaderMaterial ref={cloudShader} uniforms={cloudUniforms} vertexShader={pointVertex} fragmentShader={pointFragment} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </points>
  </group>
}

const flowVertex = `
uniform float uTime;
uniform float uFlow;
attribute float aSize;
attribute float aPhase;
attribute vec3 aColor;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec3 p = position;
  float angle = atan(p.z, p.x) + uTime * uFlow * (0.3 + aPhase * 0.075);
  float radius = length(p.xz) * (0.86 + 0.14 * sin(uTime * 0.9 + aPhase));
  p.x = cos(angle) * radius;
  p.z = sin(angle) * radius;
  p.y += sin(uTime * 0.85 + aPhase) * 0.13;
  vec4 view = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * view;
  gl_PointSize = clamp(aSize * 510.0 / max(1.0, -view.z), 1.0, 8.0);
  vColor = aColor * (0.8 + 0.35 * sin(uTime * 1.1 + aPhase));
  vAlpha = 0.5 + 0.25 * sin(uTime * 0.8 + aPhase);
}`
function InternalFlow({ motion, mobile }: { motion: SceneMotion; mobile: boolean }) {
  const shader = useRef<THREE.ShaderMaterial>(null!)
  const root = useRef<THREE.Points>(null!)
  const data = useMemo(() => {
    const rand = random(455)
    const count = mobile ? 1500 : 2800
    const position = new Float32Array(count * 3)
    const color = new Float32Array(count * 3)
    const phase = new Float32Array(count)
    const size = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const y = (rand() - 0.5) * 2.5
      const ring = Math.sqrt(Math.max(0, 1.6 - y * y)) * (0.42 + rand() * 0.55)
      const angle = y * 5 + (i % 6) * Math.PI / 3 + rand() * 0.18
      position.set([Math.cos(angle) * ring, y, Math.sin(angle) * ring], i * 3)
      color.set(cyan.clone().lerp(violet, i % 3 === 0 ? 0.9 : 0.15).multiplyScalar(1.3 + rand()).toArray(), i * 3)
      phase[i] = rand() * 6.28
      size[i] = 0.009 + rand() * 0.026
    }
    return { position, color, phase, size }
  }, [mobile])
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uFlow: { value: 1 } }), [])
  useFrame(() => {
    shader.current.uniforms.uTime.value = motion.time
    shader.current.uniforms.uFlow.value = motion.variant === 'flow' ? 2 : 1
    root.current.rotation.z = Math.sin(motion.time * 0.2) * 0.2
    root.current.rotation.x = motion.time * 0.07
  })
  return <points ref={root} renderOrder={3} frustumCulled={false}>
    <bufferGeometry>
      <bufferAttribute attach="attributes-position" args={[data.position, 3]} />
      <bufferAttribute attach="attributes-aColor" args={[data.color, 3]} />
      <bufferAttribute attach="attributes-aPhase" args={[data.phase, 1]} />
      <bufferAttribute attach="attributes-aSize" args={[data.size, 1]} />
    </bufferGeometry>
    <shaderMaterial ref={shader} vertexShader={flowVertex} fragmentShader={pointFragment} uniforms={uniforms} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
  </points>
}

function NeuralLinks({ motion, mobile }: { motion: SceneMotion; mobile: boolean }) {
  const group = useRef<THREE.Group>(null!)
  const lines = useRef<THREE.LineSegments>(null!)
  const packets = useRef<THREE.Points>(null!)
  const nodes = useRef<THREE.Points>(null!)
  const { gl } = useThree()
  const epoch = useRef(-1)
  const links = useRef<[number, number][]>([])
  const data = useMemo(() => {
    const rand = random(682)
    const count = mobile ? 70 : 105
    const base = Array.from({ length: count }, (_, i) => {
      const y = 1 - (i / (count - 1)) * 2
      const angle = i * Math.PI * (3 - Math.sqrt(5))
      const r = Math.sqrt(1 - y * y)
      return new THREE.Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r).multiplyScalar(1.9 + rand() * 0.3)
    })
    return {
      base,
      position: new Float32Array(count * 3),
      nodeColor: new Float32Array(base.flatMap(p => violet.clone().lerp(cyan, (p.x + 2.2) / 4.4).multiplyScalar(2.4).toArray())),
      linePosition: new Float32Array(650 * 6),
      lineColor: new Float32Array(650 * 6),
      packetPosition: new Float32Array(160 * 3),
      packetColor: new Float32Array(Array.from({ length: 160 }, (_, i) => (i % 4 ? cyan : violet).clone().multiplyScalar(5).toArray()).flat()),
      sizes: new Float32Array(count).fill(0.055),
      phases: new Float32Array(base.map((_, i) => i * 0.7)),
      packetSizes: new Float32Array(160).fill(0.05),
      packetPhases: new Float32Array(160).fill(0),
    }
  }, [mobile])
  const nodeShader = useRef<THREE.ShaderMaterial>(null!)
  const packetShader = useRef<THREE.ShaderMaterial>(null!)
  const nodeUniforms = useMemo(() => ({ uTime: { value: 0 }, uScale: { value: 420 } }), [])
  const packetUniforms = useMemo(() => ({ uTime: { value: 0 }, uScale: { value: 450 } }), [])
  const lastData = useRef(data)
  useFrame(() => {
    const time = motion.time
    const currentEpoch = Math.floor(time / 2.2)
    for (let i = 0; i < data.base.length; i++) {
      const p = data.base[i]
      const breathing = 1 + Math.sin(time * 0.6 + i * 1.7) * 0.055
      const offset = i * 3
      data.position[offset] = p.x * breathing + Math.sin(time * 0.43 + i) * 0.09
      data.position[offset + 1] = p.y * breathing + Math.cos(time * 0.38 + i * 1.2) * 0.09
      data.position[offset + 2] = p.z * breathing
    }
    if (epoch.current !== currentEpoch || lastData.current !== data) {
      lastData.current = data
      const rand = random(currentEpoch + 302)
      const next: [number, number][] = []
      for (let a = 0; a < data.base.length; a++) {
        for (let b = a + 1; b < data.base.length; b++) {
          if (data.base[a].distanceToSquared(data.base[b]) < (mobile ? 1.3 : 1.05) && rand() > 0.3) next.push([a, b])
        }
      }
      links.current = next.slice(0, 650)
      epoch.current = currentEpoch
      gl.domElement.dataset.linksRevision = String(currentEpoch)
      gl.domElement.dataset.linkCount = String(links.current.length)
    }
    const fade = Math.min(1, (time % 2.2) / 0.3, (2.2 - time % 2.2) / 0.3)
    links.current.forEach(([a, b], i) => {
      data.linePosition.set(data.position.subarray(a * 3, a * 3 + 3), i * 6)
      data.linePosition.set(data.position.subarray(b * 3, b * 3 + 3), i * 6 + 3)
      const strength = (0.06 + (Math.sin(time * 1.2 + i * 0.67) + 1) * 0.07) * (0.15 + 0.85 * fade) * (motion.variant === 'flow' ? 0.45 : 1)
      for (let k = 0; k < 3; k++) {
        data.lineColor[i * 6 + k] = data.nodeColor[a * 3 + k] * strength
        data.lineColor[i * 6 + k + 3] = data.nodeColor[b * 3 + k] * strength
      }
    })
    const packetCount = Math.min(links.current.length, 160)
    for (let i = 0; i < packetCount; i++) {
      const [a, b] = links.current[(i * 3) % links.current.length]
      const t = (time * (0.27 + (i % 5) * 0.032) + i * 0.618) % 1
      for (let k = 0; k < 3; k++) data.packetPosition[i * 3 + k] = THREE.MathUtils.lerp(data.position[a * 3 + k], data.position[b * 3 + k], t)
    }
    nodes.current.geometry.attributes.position.needsUpdate = true
    lines.current.geometry.attributes.position.needsUpdate = true
    lines.current.geometry.attributes.color.needsUpdate = true
    lines.current.geometry.setDrawRange(0, links.current.length * 2)
    packets.current.geometry.attributes.position.needsUpdate = true
    packets.current.geometry.setDrawRange(0, packetCount)
    nodeShader.current.uniforms.uTime.value = time
    packetShader.current.uniforms.uTime.value = time
    group.current.rotation.y = time * 0.12
    group.current.rotation.z = Math.sin(time * 0.3) * 0.15
  })
  return <group ref={group}>
    <points ref={nodes} renderOrder={3}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.position, 3]} usage={THREE.DynamicDrawUsage} />
        <bufferAttribute attach="attributes-aColor" args={[data.nodeColor, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[data.sizes, 1]} />
        <bufferAttribute attach="attributes-aPhase" args={[data.phases, 1]} />
      </bufferGeometry>
      <shaderMaterial ref={nodeShader} uniforms={nodeUniforms} vertexShader={pointVertex} fragmentShader={pointFragment} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </points>
    <lineSegments ref={lines} renderOrder={2}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.linePosition, 3]} usage={THREE.DynamicDrawUsage} />
        <bufferAttribute attach="attributes-color" args={[data.lineColor, 3]} usage={THREE.DynamicDrawUsage} />
      </bufferGeometry>
      <lineBasicMaterial vertexColors transparent opacity={0.66} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </lineSegments>
    <points ref={packets} renderOrder={4} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.packetPosition, 3]} usage={THREE.DynamicDrawUsage} />
        <bufferAttribute attach="attributes-aColor" args={[data.packetColor, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[data.packetSizes, 1]} />
        <bufferAttribute attach="attributes-aPhase" args={[data.packetPhases, 1]} />
      </bufferGeometry>
      <shaderMaterial ref={packetShader} uniforms={packetUniforms} vertexShader={pointVertex} fragmentShader={pointFragment} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </points>
  </group>
}

function Orbit({ radius, tilt, speed, purple, motion }: { radius: number; tilt: [number, number, number]; speed: number; purple?: boolean; motion: SceneMotion }) {
  const ring = useRef<THREE.Group>(null!)
  const tracer = useRef<THREE.Mesh>(null!)
  const positions = useMemo(() => new Float32Array(Array.from({ length: 161 }, (_, i) => {
    const angle = i / 160 * Math.PI * 2
    return [Math.cos(angle) * radius, Math.sin(angle) * radius, 0]
  }).flat()), [radius])
  useFrame(() => {
    const orbitalSpeed = speed * (motion.variant === 'orbit' ? 2.7 : 1.8)
    ring.current.rotation.z = tilt[2] + motion.time * orbitalSpeed * 0.25
    ring.current.rotation.x = tilt[0] + Math.sin(motion.time * 0.18 + radius) * 0.13
    const angle = motion.time * orbitalSpeed
    tracer.current.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0)
  })
  return <group ref={ring} rotation={tilt}>
    <lineLoop>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
      <lineBasicMaterial color={purple ? '#7B61FF' : '#00F5FF'} transparent opacity={0.27} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </lineLoop>
    <mesh ref={tracer}><sphereGeometry args={[0.027, 8, 8]} /><meshBasicMaterial color={purple ? [1.6, 0.5, 4] : [0.2, 3.5, 4]} toneMapped={false} /></mesh>
  </group>
}

const haloFragment = `
varying vec2 vUv;
uniform vec3 uColor;
uniform float uTime;
void main() {
  float d = length(vUv - 0.5) * 2.0;
  float fog = exp(-d*d*5.0) * smoothstep(1.0, 0.65, d);
  gl_FragColor = vec4(uColor, fog * (0.16 + sin(uTime * 0.72) * 0.055));
}`
const haloVertex = `varying vec2 vUv; void main() { vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`

function Halo({ position, color, scale, motion }: { position: [number, number, number]; color: THREE.Color; scale: number; motion: SceneMotion }) {
  const ref = useRef<THREE.Mesh>(null!)
  const uniforms = useMemo(() => ({ uColor: { value: color }, uTime: { value: 0 } }), [color])
  useFrame(({ camera }) => {
    ref.current.quaternion.copy(camera.quaternion)
    uniforms.uTime.value = motion.time
    ref.current.scale.setScalar(scale * (1 + Math.sin(motion.time * 0.55 + position[0]) * 0.1))
  })
  return <mesh ref={ref} position={position} scale={scale} renderOrder={-2}>
    <planeGeometry args={[1, 1]} />
    <shaderMaterial vertexShader={haloVertex} fragmentShader={haloFragment} uniforms={uniforms} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
  </mesh>
}

const spaceVeilVertex = `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.999, 1.0); }
`
const spaceVeilFragment = `
varying vec2 vUv;
uniform float uTime;
uniform float uAspect;
float glow(float distance, float width) { return exp(-pow(distance / width, 2.0)); }
void main() {
  vec2 uv = vUv;
  float x = uv.x - 0.5;
  vec3 cyan = vec3(0.0, 0.72, 0.85);
  vec3 violet = vec3(0.32, 0.14, 0.76);
  vec3 color = vec3(0.0);
  float edgeFade = smoothstep(0.0, 0.12, uv.x) * smoothstep(0.0, 0.12, 1.0-uv.x);
  // Wide luminous ribbons above the core, with light travelling along each contour.
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float crest = 0.91 + fi * 0.021 + 0.023 * sin(x * 7.0 + uTime * 0.11 + fi * 0.6);
    float d = uv.y - crest;
    float envelope = exp(-x*x*4.0);
    float packet = pow(0.5 + 0.5 * sin(x * 5.0 - uTime * 0.32 + fi * 2.0), 16.0);
    vec3 tint = mix(violet, cyan, 0.5 + 0.5 * sin(x*3.0 + fi));
    color += tint * envelope * (glow(d, 0.0011) * (0.14 + packet * 0.65) + glow(d, 0.018) * 0.06);
  }
  // Low orbital horizon: a sparse curved grid and circulating light below the entrance.
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float arc = 0.045 + fi * 0.013 - x*x * (0.24 + fi * 0.035);
    float d = uv.y - arc;
    float packet = pow(0.5 + 0.5 * cos(x * 9.0 + uTime * 0.4 - fi), 24.0);
    color += mix(violet, cyan, fi / 4.0) * (glow(d, 0.0008) * (0.12 + packet * 0.5) + glow(d, 0.009) * 0.055);
  }
  float horizonFog = glow(uv.y - 0.07, 0.05) * exp(-x*x*7.0);
  color += mix(violet, cyan, uv.x) * horizonFog * 0.065;
  // Sparse drifting light specks confined to the upper and lower atmosphere.
  vec2 grid = vec2(uv.x * max(uAspect, 0.75), uv.y + uTime * 0.003) * 90.0;
  vec2 cell = floor(grid);
  float seed = fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453);
  float dust = glow(length(fract(grid)-0.5), 0.085) * step(0.91, seed);
  float region = smoothstep(0.76, 0.94, uv.y) + (1.0-smoothstep(0.07,0.18,uv.y));
  color += mix(violet, cyan, seed) * dust * region * (0.6 + 0.4*sin(uTime+seed*30.0));
  gl_FragColor = vec4(color * edgeFade, 1.0);
}`

function SpaceVeil({ motion }: { motion: SceneMotion }) {
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uAspect: { value: 1 } }), [])
  useFrame(({ size, gl }) => {
    uniforms.uTime.value = motion.time
    uniforms.uAspect.value = size.width / size.height
    gl.domElement.dataset.atmosphere = 'aurora-horizon'
  })
  return <mesh frustumCulled={false} renderOrder={-10}>
    <planeGeometry args={[2, 2]} />
    <shaderMaterial vertexShader={spaceVeilVertex} fragmentShader={spaceVeilFragment} uniforms={uniforms} transparent depthTest={false} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
  </mesh>
}

type SceneProps = { motion: SceneMotion; mobile: boolean; coreAnchor: RefObject<HTMLDivElement | null>; onReady: () => void; onLost: () => void }

function Space({ motion, mobile, coreAnchor, onReady, onLost }: SceneProps) {
  const { gl, camera, size, invalidate } = useThree()
  const initialized = useRef(false)
  const frames = useRef(0)
  const lastSize = useRef('')
  const projectedCore = useMemo(() => new THREE.Vector3(), [])
  useEffect(() => {
    const canvas = gl.domElement
    canvas.dataset.bloom = 'mipmap-hdr'
    const lost = (event: Event) => { event.preventDefault(); onLost() }
    canvas.addEventListener('webglcontextlost', lost)
    const resize = () => invalidate()
    const visibility = () => { motion.visible = !document.hidden; if (motion.visible) invalidate() }
    document.addEventListener('visibilitychange', visibility)
    window.addEventListener('resize', resize)
    return () => { canvas.removeEventListener('webglcontextlost', lost); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('resize', resize) }
  }, [gl, onLost, invalidate, motion])
  useFrame((_, delta) => {
    if (motion.running && motion.visible) motion.time += Math.min(delta, 0.12) * motion.speed
    const t = motion.time
    const portrait = size.width < 650
    const distance = portrait ? 13.4 : size.width < 1000 ? 10.7 : 8.7
    const azimuth = Math.sin(t * 0.085) * 0.145
    const targetX = Math.sin(azimuth) * distance + motion.pointer.x * 0.64
    const targetY = 0.4 + Math.sin(t * 0.16) * 0.23 + motion.pointer.y * 0.3
    const sizeKey = `${size.width}/${size.height}`
    const resized = lastSize.current !== sizeKey
    lastSize.current = sizeKey
    // Paused frames retain the same camera, so pointer input cannot move a frozen scene.
    if (motion.running || !initialized.current || resized) {
      const interpolate = initialized.current && !resized
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, interpolate ? 0.026 : 1)
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, interpolate ? 0.026 : 1)
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, Math.cos(azimuth) * distance, interpolate ? 0.035 : 1)
      camera.lookAt(0, -0.52, 0)
    }
    // Project the actual sphere origin after camera motion; never approximate it with viewport percentages.
    camera.updateMatrixWorld()
    projectedCore.set(0, 0.15, 0).project(camera)
    const coreX = (projectedCore.x * 0.5 + 0.5) * size.width
    const coreY = (-projectedCore.y * 0.5 + 0.5) * size.height
    if (coreAnchor.current) {
      coreAnchor.current.style.left = `${coreX}px`
      coreAnchor.current.style.top = `${coreY}px`
    }
    gl.domElement.dataset.coreX = coreX.toFixed(2)
    gl.domElement.dataset.coreY = coreY.toFixed(2)
    frames.current++
    if (frames.current % 30 === 0 || !motion.running) {
      gl.domElement.dataset.cameraX = camera.position.x.toFixed(4)
      gl.domElement.dataset.simulationTime = motion.time.toFixed(3)
      gl.domElement.dataset.scenePreset = motion.variant
      gl.domElement.dataset.corePulse = (1 + Math.sin(motion.time * 0.85) * 0.055).toFixed(4)
      gl.domElement.dataset.bloomIntensity = String(motion.bloom)
    }
    if (!initialized.current) { initialized.current = true; onReady() }
  }, -100)
  return <>
    <color attach="background" args={['#020617']} />
    <SpaceVeil motion={motion} />
    <PointField foreground={false} motion={motion} mobile={mobile} />
    <PointField foreground={false} middle motion={motion} mobile={mobile} />
    <Halo position={[-1.2, 0.15, -2.2]} color={violet} scale={8} motion={motion} />
    <Halo position={[1.5, 0.7, -2.4]} color={cyan} scale={7} motion={motion} />
    <group position={[0, 0.15, 0]}>
      <EnergyCore motion={motion} />
      <InternalFlow motion={motion} mobile={mobile} />
      <NeuralLinks motion={motion} mobile={mobile} />
      <Orbit radius={2.55} tilt={[1.12, 0.38, -0.24]} speed={0.19} motion={motion} />
      <Orbit radius={2.78} tilt={[0.4, 0.7, 0.58]} speed={-0.14} purple motion={motion} />
      <Orbit radius={2.34} tilt={[0.65, -0.65, -0.65]} speed={0.11} motion={motion} />
      <Orbit radius={1.15} tilt={[1.2, -0.4, 0.3]} speed={-0.48} purple motion={motion} />
    </group>
    <PointField foreground motion={motion} mobile={mobile} />
    <EffectComposer multisampling={0} resolutionScale={mobile ? 0.55 : 0.8}>
      <Bloom intensity={motion.bloom} luminanceThreshold={0.65} luminanceSmoothing={0.3} mipmapBlur radius={0.72} />
    </EffectComposer>
  </>
}

export default function NeuralScene({ motion, mobile, coreAnchor, onReady, onLost }: SceneProps) {
  return <Canvas camera={{ position: [0, 0.4, mobile ? 13.4 : 8.7], fov: 42, near: 0.1, far: 90 }} dpr={[1, mobile ? 1.25 : 1.5]} gl={{ antialias: false, alpha: false, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping }} frameloop={motion.running && motion.visible ? 'always' : 'demand'} fallback={<div className="scene-fallback" aria-hidden="true" />}>
    <Space motion={motion} mobile={mobile} coreAnchor={coreAnchor} onReady={onReady} onLost={onLost} />
  </Canvas>
}
