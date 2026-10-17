import { useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import * as THREE from 'three'
import { CommandCore, MechanicalShell, ProjectionDeck, Shockwave, DocumentNodes } from './SceneEnhancements'

export type SceneMotion = { time: number; pointer: THREE.Vector2; corePointer: THREE.Vector2; proximity: number; drag: THREE.Vector2; pulseAt: number; link: 'document' | 'github' | null; pointerActive: boolean; pointerRevision: number; running: boolean; visible: boolean; variant: 'core' | 'flow' | 'network'; speed: number; bloom: number }

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
  vec3 color = vec3(0.002, 0.005, 0.015) + tint * rim * 0.4 * flux;
  color += tint * contour * (0.015 + rim * 0.12);
  gl_FragColor = vec4(color, 0.18);
}`

const surfaceVertex = `
uniform float uTime;
uniform float uScale;
uniform float uNetwork;
uniform float uFlow;
uniform float uProximity;
uniform vec2 uPointer;
attribute float aSize;
attribute float aPhase;
attribute vec3 aColor;
varying vec3 vColor;
varying float vAlpha;
void main() {
  float radius = length(position);
  float latitude = asin(clamp(position.y / radius, -1.0, 1.0));
  float longitude = atan(position.z, position.x) + uTime * (0.24 + 0.07 * sin(latitude * 4.0));
  latitude += sin(longitude * 3.0 + uTime * 0.5) * 0.018;
  longitude += latitude * 0.6 + sin(latitude * 12.0 + uTime * 0.4) * 0.055;
  vec3 p = radius * vec3(cos(longitude)*cos(latitude), sin(latitude), sin(longitude)*cos(latitude));
  // Continuous GPU morphs keep the same particles through every scene mode.
  float lane = floor(aPhase * 4.0);
  vec3 network = floor(position * 2.0 + 0.5) / 2.0;
  float angle = longitude * 1.5 + uTime * 0.8 + latitude * 3.0;
  float height = latitude / 1.5708;
  float funnel = 0.32 + 1.2 * pow(abs(height), 1.3);
  vec3 flow = vec3(cos(angle) * funnel, height*1.7, sin(angle)*funnel);
  flow *= 0.9 + 0.1*sin(lane+uTime);
  p = mix(p, network, uNetwork);
  p = mix(p, flow, uFlow);
  vec3 attractor = vec3(uPointer.x*2.5, uPointer.y*2.5, 1.2);
  float influence = exp(-length(p-attractor)*2.0)*uProximity;
  p += (attractor-p)*influence*0.42;
  vec4 view = modelViewMatrix * vec4(p, 1.0);
  float scan = mod(uTime * 0.65, 4.8) - 2.4;
  float sweep = exp(-pow((p.y - scan) / 0.13, 2.0));
  float facing = 0.4 + 0.6 * max(0.0, dot(normalize(normalMatrix * p), normalize(-view.xyz)));
  gl_Position = projectionMatrix * view;
  gl_PointSize = clamp(aSize * uScale * (1.0 + sweep * 1.5) / max(1.0, -view.z), 1.0, 7.0);
  vColor = mix(aColor, vec3(2.0, 3.0, 3.2), sweep * 0.85);
  vAlpha = (facing * (0.6 + 0.4 * sin(aPhase + uTime * 1.2)) + sweep * 0.6) * (1.0-uNetwork*0.55);
}`

function EnergyCore({ motion, mobile }: { motion: SceneMotion; mobile: boolean }) {
  const { gl } = useThree()
  const root = useRef<THREE.Group>(null!)
  const shader = useRef<THREE.ShaderMaterial>(null!)
  const cloud = useRef<THREE.Points>(null!)
  const cloudShader = useRef<THREE.ShaderMaterial>(null!)
  const data = useMemo(() => {
    const rand = random(119)
    const count = mobile ? 3200 : 6200
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
      const color = new THREE.Color('#209bff').lerp(cyan, rand() * 0.9).multiplyScalar(1.2 + rand() * 1.4)
      colors.set(color.toArray(), i * 3)
      sizes[i] = 0.014 + rand() * 0.022
      phases[i] = rand() * 6.28
    }
    return { positions, colors, sizes, phases }
  }, [mobile])
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), [])
  const cloudUniforms = useMemo(() => ({ uTime: { value: 0 }, uScale: { value: 550 }, uNetwork: { value: 0 }, uFlow: { value: 0 }, uProximity: { value: 0 }, uPointer: { value: new THREE.Vector2() } }), [])
  const morph = useRef({ network: 0, flow: 0, proximity: 0 })
  useFrame((_, delta) => {
    shader.current.uniforms.uTime.value = motion.time
    cloudShader.current.uniforms.uTime.value = motion.time
    const factor = motion.running ? 1-Math.exp(-delta*3.2) : 0
    morph.current.network = THREE.MathUtils.lerp(morph.current.network, motion.variant==='network'?1:0, factor)
    morph.current.flow = THREE.MathUtils.lerp(morph.current.flow, motion.variant==='flow'?1:0, factor)
    morph.current.proximity = THREE.MathUtils.lerp(morph.current.proximity, motion.proximity, factor)
    const u = cloudShader.current.uniforms
    u.uNetwork.value = morph.current.network; u.uFlow.value = morph.current.flow
    u.uProximity.value = morph.current.proximity; u.uPointer.value.copy(motion.corePointer)
    gl.domElement.dataset.networkMorph = u.uNetwork.value.toFixed(3)
    gl.domElement.dataset.flowMorph = u.uFlow.value.toFixed(3)
    gl.domElement.dataset.attraction = u.uProximity.value.toFixed(3)
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
      <shaderMaterial ref={cloudShader} uniforms={cloudUniforms} vertexShader={surfaceVertex} fragmentShader={pointFragment} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </points>
  </group>
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
      const strength = (0.015 + (Math.sin(time * 1.2 + i * 0.67) + 1) * 0.018) * (0.15 + 0.85 * fade) * (motion.variant === 'flow' ? 0.45 : motion.variant === 'network' ? 3 : 1)
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
  const trail = useRef<THREE.LineSegments>(null!)
  const trailData = useMemo(() => {
    const colors = new Float32Array(40 * 6)
    const tint = (purple ? violet : cyan).clone().multiplyScalar(2)
    for (let i = 0; i < 40; i++) {
      const fade = Math.pow(1-i/40, 2)
      colors.set(tint.clone().multiplyScalar(fade).toArray(), i*6)
      colors.set(tint.clone().multiplyScalar(fade).toArray(), i*6+3)
    }
    return { positions: new Float32Array(40*6), colors }
  }, [purple])
  const positions = useMemo(() => new Float32Array(Array.from({ length: 161 }, (_, i) => {
    const angle = i / 160 * Math.PI * 2
    return [Math.cos(angle) * radius, Math.sin(angle) * radius, 0]
  }).flat()), [radius])
  useFrame(() => {
    const orbitalSpeed = speed * (motion.variant === 'network' ? 2.7 : 1.8)
    ring.current.rotation.z = tilt[2] + motion.time * orbitalSpeed * 0.25
    ring.current.rotation.x = tilt[0] + Math.sin(motion.time * 0.18 + radius) * 0.13
    ring.current.rotation.y = tilt[1] + Math.sin(motion.time * 0.11 + radius) * 0.18
    const angle = motion.time * orbitalSpeed
    tracer.current.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0)
    tracer.current.scale.setScalar(1 + Math.sin(motion.time*2.4+radius)*0.2)
    for (let i=0; i<40; i++) {
      const a = angle - Math.sign(speed)*i*.018
      const b = angle - Math.sign(speed)*(i+1)*.018
      trailData.positions.set([Math.cos(a)*radius,Math.sin(a)*radius,0,Math.cos(b)*radius,Math.sin(b)*radius,0],i*6)
    }
    trail.current.geometry.attributes.position.needsUpdate = true
  })
  return <group ref={ring} rotation={tilt}>
    <lineLoop>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
      <lineBasicMaterial color={purple ? '#7B61FF' : '#00F5FF'} transparent opacity={0.22} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </lineLoop>
    <lineSegments ref={trail}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[trailData.positions,3]} usage={THREE.DynamicDrawUsage} /><bufferAttribute attach="attributes-color" args={[trailData.colors,3]} /></bufferGeometry>
      <lineBasicMaterial vertexColors transparent opacity={.75} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </lineSegments>
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
    ;(ref.current.material as THREE.ShaderMaterial).uniforms.uTime.value = motion.time
    ref.current.scale.setScalar(scale * (1 + Math.sin(motion.time * 0.55 + position[0]) * 0.1))
  })
  return <mesh ref={ref} position={position} scale={scale} renderOrder={-2}>
    <planeGeometry args={[1, 1]} />
    <shaderMaterial vertexShader={haloVertex} fragmentShader={haloFragment} uniforms={uniforms} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
  </mesh>
}

const TRAIL_LIFETIME = 0.3
const TRAIL_LENGTH = 110
const trailVertex = `
uniform float uTime;
uniform float uDpr;
uniform float uHeadDistance;
attribute float aBirth;
attribute float aDistance;
varying float vLife;
varying float vTaper;
void main() {
  float age = max(0.0, uTime - aBirth);
  vLife = max(0.0, 1.0 - age / 0.3);
  vTaper = clamp(1.0 - (uHeadDistance - aDistance) / 110.0, 0.0, 1.0);
  gl_Position = vec4(position.xy, 0.0, 1.0);
  gl_PointSize = max(1.0, (1.5 + 20.0 * pow(vTaper, 1.4)) * uDpr * vLife);
}`
const trailFragment = `
varying float vLife;
varying float vTaper;
void main() {
  if (vLife <= 0.0 || vTaper <= 0.0) discard;
  float d = length(gl_PointCoord - 0.5) * 2.0;
  if (d > 1.0) discard;
  vec3 tint = mix(vec3(0.55, 0.22, 1.2), vec3(0.1, 1.25, 1.5), vTaper);
  float glow = exp(-d*d*8.0) * 0.35 + exp(-d*d*48.0) * 0.5;
  gl_FragColor = vec4(tint, glow * vLife * vLife * vTaper);
}`

function PointerTrail({ motion }: { motion: SceneMotion }) {
  const points = useRef<THREE.Points>(null!)
  const last = useRef(new THREE.Vector2())
  const connected = useRef(false)
  const revision = useRef(-1)
  const cursor = useRef(0)
  const headDistance = useRef(0)
  const lastSize = useRef('')
  const data = useMemo(() => ({ position: new Float32Array(64 * 3), birth: new Float32Array(64).fill(-100), distance: new Float32Array(64) }), [])
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uDpr: { value: 1 }, uHeadDistance: { value: 0 } }), [])
  useFrame(({ size, gl }) => {
    // Pointer feedback uses wall time, independent of the scene speed and animation clock.
    const now = performance.now() / 1000
    uniforms.uTime.value = now
    uniforms.uDpr.value = gl.getPixelRatio()
    const sizeKey = `${size.width}/${size.height}`
    const enabled = motion.running && motion.visible && motion.pointerActive
    if (lastSize.current !== sizeKey || !enabled) {
      data.birth.fill(-100)
      points.current.geometry.attributes.aBirth.needsUpdate = true
      lastSize.current = sizeKey
      connected.current = false
      if (!enabled) revision.current = motion.pointerRevision
    }
    if (enabled && revision.current !== motion.pointerRevision) {
      const distance = connected.current ? Math.hypot((motion.pointer.x-last.current.x)*size.width/2, (motion.pointer.y-last.current.y)*size.height/2) : 0
      if (!connected.current) last.current.copy(motion.pointer)
      if (!connected.current || distance > 0.5) {
        headDistance.current += distance
        const segment = Math.min(distance, TRAIL_LENGTH)
        const count = Math.max(1, Math.ceil(segment / 3))
        for (let i = 1; i <= count; i++) {
          const index = cursor.current++ % 64
          const behind = segment * (1 - i/count)
          const fraction = distance ? 1 - behind / distance : 1
          data.position[index*3] = THREE.MathUtils.lerp(last.current.x, motion.pointer.x, fraction)
          data.position[index*3+1] = THREE.MathUtils.lerp(last.current.y, motion.pointer.y, fraction)
          data.birth[index] = now
          data.distance[index] = headDistance.current - behind
        }
        points.current.geometry.attributes.position.needsUpdate = true
        points.current.geometry.attributes.aBirth.needsUpdate = true
        points.current.geometry.attributes.aDistance.needsUpdate = true
        last.current.copy(motion.pointer)
      }
      revision.current = motion.pointerRevision
      connected.current = true
    }
    uniforms.uHeadDistance.value = headDistance.current
    const actualUniforms = (points.current.material as THREE.ShaderMaterial).uniforms
    actualUniforms.uTime.value = now
    actualUniforms.uDpr.value = gl.getPixelRatio()
    actualUniforms.uHeadDistance.value = headDistance.current
    let active = 0
    let length = 0
    for (let i = 0; i < data.birth.length; i++) {
      const behind = headDistance.current - data.distance[i]
      if (now-data.birth[i] < TRAIL_LIFETIME && behind < TRAIL_LENGTH) {
        active++
        length = Math.max(length, behind)
      }
    }
    gl.domElement.dataset.trailParticles = String(active)
    gl.domElement.dataset.trailLength = length.toFixed(2)
  })
  return <points ref={points} frustumCulled={false} renderOrder={20}>
    <bufferGeometry>
      <bufferAttribute attach="attributes-position" args={[data.position, 3]} usage={THREE.DynamicDrawUsage} />
      <bufferAttribute attach="attributes-aBirth" args={[data.birth, 1]} usage={THREE.DynamicDrawUsage} />
      <bufferAttribute attach="attributes-aDistance" args={[data.distance, 1]} usage={THREE.DynamicDrawUsage} />
    </bufferGeometry>
    <shaderMaterial uniforms={uniforms} vertexShader={trailVertex} fragmentShader={trailFragment} transparent depthTest={false} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
  </points>
}

type SceneProps = { motion: SceneMotion; mobile: boolean; sceneAnchor: RefObject<HTMLElement | null>; onReady: () => void; onLost: () => void }

function Space({ motion, mobile, sceneAnchor, onReady, onLost }: SceneProps) {
  const { gl, camera, size, invalidate } = useThree()
  const initialized = useRef(false)
  const frames = useRef(0)
  const lastSize = useRef('')
  const projectedCore = useMemo(() => new THREE.Vector3(), [])
  const stage = useRef({ x: 0, y: 0, width: 1, height: 1 })
  const layoutRevision = useRef(0)
  const assembly = useRef<THREE.Group>(null!)
  useEffect(() => {
    const element = sceneAnchor.current
    if (!element) return
    const update = () => {
      const bounds = element.getBoundingClientRect()
      const canvasBounds = gl.domElement.getBoundingClientRect()
      stage.current = { x: bounds.x-canvasBounds.x, y: bounds.y-canvasBounds.y, width: bounds.width, height: bounds.height }
      layoutRevision.current++
      invalidate()
    }
    const observer = new ResizeObserver(update)
    observer.observe(element)
    observer.observe(gl.domElement)
    update()
    return () => observer.disconnect()
  }, [sceneAnchor, gl, invalidate])
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
    const smooth = motion.running ? 1-Math.exp(-delta*5) : 0
    assembly.current.rotation.y = THREE.MathUtils.lerp(assembly.current.rotation.y, motion.drag.x, smooth)
    assembly.current.rotation.x = THREE.MathUtils.lerp(assembly.current.rotation.x, motion.drag.y, smooth)
    assembly.current.scale.setScalar(motion.running ? .75+.25*THREE.MathUtils.smoothstep(motion.time,.6,2.3) : 1)
    const t = motion.time
    const panel = stage.current
    const radiusPixels = Math.max(80, Math.min(panel.width, panel.height) * 0.42)
    const distance = size.height * 2.85 / (2 * Math.tan(42 * Math.PI / 360) * radiusPixels)
    const azimuth = Math.sin(t * 0.085) * 0.145
    const targetX = Math.sin(azimuth) * distance + motion.pointer.x * 0.64
    const targetY = 0.55 + Math.sin(t * 0.16) * 0.23 + motion.pointer.y * 0.3
    const sizeKey = `${size.width}/${size.height}/${layoutRevision.current}`
    const resized = lastSize.current !== sizeKey
    lastSize.current = sizeKey
    // Paused frames retain the same camera, so pointer input cannot move a frozen scene.
    if (motion.running || !initialized.current || resized) {
      const interpolate = initialized.current && !resized
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, interpolate ? 0.026 : 1)
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, interpolate ? 0.026 : 1)
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, Math.cos(azimuth) * distance, interpolate ? 0.035 : 1)
      camera.lookAt(0, 0.15, 0)
      ;(camera as THREE.PerspectiveCamera).setViewOffset(size.width, size.height, size.width/2-panel.x-panel.width/2, size.height/2-panel.y-panel.height/2, size.width, size.height)
    }
    // Project the actual sphere origin after camera motion; never approximate it with viewport percentages.
    camera.updateMatrixWorld()
    projectedCore.set(0, 0.15, 0).project(camera)
    const coreX = (projectedCore.x * 0.5 + 0.5) * size.width
    const coreY = (-projectedCore.y * 0.5 + 0.5) * size.height
    gl.domElement.dataset.coreX = coreX.toFixed(2)
    gl.domElement.dataset.coreY = coreY.toFixed(2)
    frames.current++
    if (frames.current % 30 === 0 || !motion.running) {
      gl.domElement.dataset.cameraX = camera.position.x.toFixed(4)
      gl.domElement.dataset.simulationTime = motion.time.toFixed(3)
      gl.domElement.dataset.scenePreset = motion.variant
      gl.domElement.dataset.corePulse = (1 + Math.sin(motion.time * 0.85) * 0.055).toFixed(4)
      gl.domElement.dataset.bloomIntensity = String(motion.bloom)
      gl.domElement.dataset.surfaceFlow = 'latitude-spiral-sweep'
      gl.domElement.dataset.uplink = motion.link || 'idle'
      gl.domElement.dataset.dragRotation = assembly.current.rotation.y.toFixed(3)
    }
    if (!initialized.current) { initialized.current = true; onReady() }
  }, -100)
  return <>
    <color attach="background" args={['#040711']} />
    <PointField foreground={false} motion={motion} mobile={mobile} />
    <PointField foreground={false} middle motion={motion} mobile={mobile} />
    <Halo position={[-1.2, 0.15, -2.2]} color={violet} scale={8} motion={motion} />
    <Halo position={[1.5, 0.7, -2.4]} color={cyan} scale={7} motion={motion} />
    <group ref={assembly} position={[0, 0.15, 0]}>
      <CommandCore motion={motion} />
      <EnergyCore motion={motion} mobile={mobile} />
      <MechanicalShell motion={motion} />
      <DocumentNodes motion={motion} />
      <NeuralLinks motion={motion} mobile={mobile} />
      <Orbit radius={2.55} tilt={[1.12, 0.38, -0.24]} speed={0.19} motion={motion} />
      <Orbit radius={2.78} tilt={[0.4, 0.7, 0.58]} speed={-0.14} purple motion={motion} />
      <Orbit radius={2.34} tilt={[0.65, -0.65, -0.65]} speed={0.11} motion={motion} />
      <Orbit radius={1.15} tilt={[1.2, -0.4, 0.3]} speed={-0.48} purple motion={motion} />
    </group>
    <ProjectionDeck motion={motion} />
    <group position={[0,.15,0]}><Shockwave motion={motion} /></group>
    <PointField foreground motion={motion} mobile={mobile} />
    <PointerTrail motion={motion} />
    <EffectComposer multisampling={0} resolutionScale={mobile ? 0.55 : 0.8}>
      <Bloom intensity={motion.bloom} luminanceThreshold={0.65} luminanceSmoothing={0.3} mipmapBlur radius={0.72} />
    </EffectComposer>
  </>
}

export default function NeuralScene({ motion, mobile, sceneAnchor, onReady, onLost }: SceneProps) {
  return <Canvas camera={{ position: [0, 0.4, mobile ? 13.4 : 8.7], fov: 42, near: 0.1, far: 90 }} dpr={[1, mobile ? 1.25 : 1.5]} gl={{ antialias: false, alpha: false, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping }} frameloop={motion.running && motion.visible ? 'always' : 'demand'} fallback={<div className="scene-fallback" aria-hidden="true" />}>
    <Space motion={motion} mobile={mobile} sceneAnchor={sceneAnchor} onReady={onReady} onLost={onLost} />
  </Canvas>
}
