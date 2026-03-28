import { useRef, useEffect, Suspense, Component, type ReactNode } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF, Clone } from '@react-three/drei'
import * as THREE from 'three'

const SPEED = 3
const MODEL_URL = '/models/characters/character-male-a.glb'

useGLTF.preload(MODEL_URL)

interface PlayerProps {
  onPositionChange?: (pos: THREE.Vector3) => void
}

// Separate component so useGLTF suspension doesn't block movement logic
function CharacterModel() {
  const { scene } = useGLTF(MODEL_URL)
  return <Clone object={scene} scale={1} />
}

function FallbackBody() {
  return (
    <group>
      <mesh position={[0, 0.25, 0]}>
        <capsuleGeometry args={[0.12, 0.3, 8, 16]} />
        <meshLambertMaterial color="#4488cc" />
      </mesh>
      <mesh position={[0, 0.55, 0]}>
        <sphereGeometry args={[0.1, 12, 12]} />
        <meshLambertMaterial color="#ffcc88" />
      </mesh>
    </group>
  )
}

class ModelCatcher extends Component<{ children: ReactNode }, { err: boolean }> {
  state = { err: false }
  static getDerivedStateFromError() { return { err: true } }
  render() { return this.state.err ? <FallbackBody /> : this.props.children }
}

export default function Player({ onPositionChange }: PlayerProps) {
  const { camera } = useThree()
  const groupRef = useRef<THREE.Group>(null)
  const keys = useRef({ w: false, a: false, s: false, d: false })
  const facingAngle = useRef(0)

  const _forward = useRef(new THREE.Vector3())
  const _right = useRef(new THREE.Vector3())
  const _dir = useRef(new THREE.Vector3())
  const _up = useRef(new THREE.Vector3(0, 1, 0))

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (k in keys.current) keys.current[k as keyof typeof keys.current] = true
    }
    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (k in keys.current) keys.current[k as keyof typeof keys.current] = false
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  useFrame((_, delta) => {
    if (!groupRef.current) return

    const { w, a, s, d } = keys.current
    const forward = _forward.current
    const right = _right.current
    const dir = _dir.current

    camera.getWorldDirection(forward)
    forward.y = 0
    forward.normalize()
    right.crossVectors(forward, _up.current).normalize()

    dir.set(0, 0, 0)
    if (w) dir.add(forward)
    if (s) dir.sub(forward)
    if (a) dir.sub(right)
    if (d) dir.add(right)

    if (dir.lengthSq() > 0) {
      dir.normalize()
      groupRef.current.position.addScaledVector(dir, SPEED * delta)
      facingAngle.current = Math.atan2(dir.x, dir.z)
    }

    const cur = groupRef.current.rotation.y
    let diff = facingAngle.current - cur
    diff = ((diff + Math.PI) % (Math.PI * 2)) - Math.PI
    groupRef.current.rotation.y += diff * Math.min(1, 10 * delta)

    onPositionChange?.(groupRef.current.position)
  })

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Ground marker — always visible */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.2, 0.35, 24]} />
        <meshBasicMaterial color="#00ff88" side={THREE.DoubleSide} transparent opacity={0.8} />
      </mesh>

      {/* 3D model with fallback */}
      <ModelCatcher>
        <Suspense fallback={<FallbackBody />}>
          <CharacterModel />
        </Suspense>
      </ModelCatcher>
    </group>
  )
}
