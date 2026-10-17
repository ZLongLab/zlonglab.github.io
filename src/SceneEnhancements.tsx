import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { SceneMotion } from './NeuralScene'

const cyan = new THREE.Color('#00eaff').multiplyScalar(1.8)
const violet = new THREE.Color('#8964ff').multiplyScalar(1.7)
const additive = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }

function arcs(radius: number, segments: number, gap: number) {
  const coordinates: number[] = []
  for (let segment=0;segment<segments;segment++) {
    const start=segment*Math.PI*2/segments, length=Math.PI*2/segments-gap
    for (let i=0;i<28;i++) {
      const a=start+i/28*length, b=start+(i+1)/28*length
      coordinates.push(Math.cos(a)*radius,Math.sin(a)*radius,0,Math.cos(b)*radius,Math.sin(b)*radius,0)
    }
  }
  return new Float32Array(coordinates)
}

function ArcRing({ radius, segments, gap, color, opacity = .5 }: { radius: number; segments: number; gap: number; color: THREE.Color; opacity?: number }) {
  const positions=useMemo(()=>arcs(radius,segments,gap),[radius,segments,gap])
  return <lineSegments><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions,3]} /></bufferGeometry><lineBasicMaterial {...additive} color={color} opacity={opacity} /></lineSegments>
}

export function CommandCore({ motion }: { motion: SceneMotion }) {
  const root=useRef<THREE.Group>(null!)
  const body=useRef<THREE.Mesh>(null!)
  const dust=useRef<THREE.Points>(null!)
  const data=useMemo(()=>{
    const positions=new Float32Array(550*3)
    for(let i=0;i<550;i++) {
      const angle=i*2.39996, r=.2+(i%97)/97*.64, y=(i/549-.5)*1.3
      positions.set([Math.cos(angle)*r,y,Math.sin(angle)*r],i*3)
    }
    return positions
  },[])
  useFrame(()=>{
    root.current.rotation.set(motion.time*.19,-motion.time*.24,motion.time*.08)
    body.current.scale.setScalar(1+Math.sin(motion.time*1.9)*.06)
    dust.current.rotation.y=motion.time*.3
  })
  return <group ref={root}>
    <mesh ref={body}><icosahedronGeometry args={[.34,1]} /><meshBasicMaterial {...additive} color={cyan} wireframe opacity={.7} /></mesh>
    <mesh rotation={[.6,.4,0]}><icosahedronGeometry args={[.56,0]} /><meshBasicMaterial {...additive} color={violet} wireframe opacity={.38} /></mesh>
    <mesh><sphereGeometry args={[.15,16,12]} /><meshBasicMaterial {...additive} color={[.5,2.7,3]} opacity={.7} /></mesh>
    <points ref={dust}><bufferGeometry><bufferAttribute attach="attributes-position" args={[data,3]} /></bufferGeometry><pointsMaterial {...additive} size={.013} color={cyan} opacity={.38} /></points>
    <group rotation={[.8,.6,0]}><ArcRing radius={.8} segments={3} gap={.4} color={cyan} opacity={.28} /></group>
  </group>
}

export function MechanicalShell({ motion }: { motion: SceneMotion }) {
  const first=useRef<THREE.Group>(null!), second=useRef<THREE.Group>(null!)
  const ticks=useMemo(()=>{
    const p:number[]=[]
    for(let i=0;i<96;i++) {
      const a=i/96*Math.PI*2, r=i%8===0?2.31:2.24
      p.push(Math.cos(a)*2.19,Math.sin(a)*2.19,0,Math.cos(a)*r,Math.sin(a)*r,0)
    }
    return new Float32Array(p)
  },[])
  useFrame(()=>{
    first.current.rotation.set(.3+Math.sin(motion.time*.13)*.1,motion.time*.035,motion.time*.08)
    second.current.rotation.set(1.12,-.55,-motion.time*.11)
  })
  return <>
    <group ref={first}>
      <ArcRing radius={2.13} segments={6} gap={.16} color={cyan} opacity={.38} />
      <ArcRing radius={2.16} segments={6} gap={.36} color={cyan} opacity={.13} />
      <lineSegments><bufferGeometry><bufferAttribute attach="attributes-position" args={[ticks,3]} /></bufferGeometry><lineBasicMaterial {...additive} color={cyan} opacity={.27} /></lineSegments>
    </group>
    <group ref={second}><ArcRing radius={2.43} segments={4} gap={.24} color={violet} opacity={.45} /><ArcRing radius={2.48} segments={4} gap={.65} color={violet} opacity={.19} /></group>
  </>
}

const deckVertex=`varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`
const deckFragment=`
varying vec2 vUv; uniform float uTime;
void main(){
  vec2 p=(vUv-.5)*2.0; float r=length(p); float a=atan(p.y,p.x);
  float ring=exp(-pow((r-.79)/.004,2.0))*.6+exp(-pow((r-.61)/.003,2.0))*.35;
  float ripple=pow(max(0.0,sin(r*33.0-uTime*1.3)),16.0)*.12;
  float radar=pow(max(0.0,cos(a-uTime*.28)),36.0)*.22;
  float haze=exp(-r*r*6.0)*.1;
  float alpha=(ring+ripple+radar+haze)*smoothstep(1.0,.7,r);
  vec3 color=mix(vec3(.1,.65,.9),vec3(.55,.22,1.0),r);
  gl_FragColor=vec4(color,alpha);
}`

export function ProjectionDeck({ motion }: { motion: SceneMotion }) {
  const shader=useRef<THREE.ShaderMaterial>(null!)
  const ring=useRef<THREE.Group>(null!)
  const uniforms=useMemo(()=>({uTime:{value:0}}),[])
  useFrame(()=>{shader.current.uniforms.uTime.value=motion.time;ring.current.rotation.z=-motion.time*.055})
  return <group position={[0,-2.38,0]} rotation={[-Math.PI/2,0,0]}>
    <mesh><planeGeometry args={[5.4,5.4]} /><shaderMaterial ref={shader} uniforms={uniforms} vertexShader={deckVertex} fragmentShader={deckFragment} {...additive} side={THREE.DoubleSide} /></mesh>
    <group ref={ring} position={[0,0,.01]}><ArcRing radius={2.1} segments={12} gap={.18} color={cyan} opacity={.38} /></group>
    <group position={[0,0,.08]}><ArcRing radius={1.6} segments={4} gap={.4} color={violet} opacity={.3} /></group>
  </group>
}

export function Shockwave({ motion }: { motion: SceneMotion }) {
  const wave=useRef<THREE.Mesh>(null!)
  const material=useRef<THREE.MeshBasicMaterial>(null!)
  const { camera, gl }=useThree()
  useFrame(()=>{
    const age=motion.time-motion.pulseAt
    const active=age>=0 && age<1.5
    wave.current.visible=active
    wave.current.quaternion.copy(camera.quaternion)
    wave.current.scale.setScalar(.3+Math.max(0,age)*2.3)
    material.current.opacity=active ? Math.pow(1-age/1.5,2)*.7 : 0
    gl.domElement.dataset.pulseAge=age.toFixed(3)
  })
  return <mesh ref={wave}><ringGeometry args={[.98,1.005,128]} /><meshBasicMaterial ref={material} {...additive} color={cyan} side={THREE.DoubleSide} opacity={0} /></mesh>
}

/** Small document outlines become visible only while the document uplink is active. */
export function DocumentNodes({ motion }: { motion: SceneMotion }) {
  const root=useRef<THREE.Group>(null!)
  const material=useRef<THREE.LineBasicMaterial>(null!)
  const alpha=useRef(0)
  const positions=useMemo(()=>{
    const vertices:number[]=[]
    for(let i=0;i<8;i++) {
      const a=i/8*Math.PI*2, x=Math.cos(a)*1.7, y=Math.sin(a)*1.7, z=Math.sin(i*2)*.8
      const lines=[[-.08,-.12,.08,-.12],[.08,-.12,.08,.12],[.08,.12,-.08,.12],[-.08,.12,-.08,-.12],[-.04,.04,.04,.04],[-.04,-.02,.04,-.02]]
      lines.forEach(([ax,ay,bx,by])=>vertices.push(x+ax,y+ay,z,x+bx,y+by,z))
    }
    return new Float32Array(vertices)
  },[])
  useFrame((_,delta)=>{
    if(motion.running) alpha.current=THREE.MathUtils.damp(alpha.current,motion.link==='document'?.8:0,4,delta)
    material.current.opacity=alpha.current
    root.current.rotation.y=motion.time*.12
  })
  return <group ref={root}><lineSegments><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions,3]} /></bufferGeometry><lineBasicMaterial ref={material} {...additive} color={cyan} opacity={0} /></lineSegments></group>
}
