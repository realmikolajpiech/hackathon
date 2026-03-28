import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const SPEED = 3

interface PlayerProps {
  onPositionChange?: (pos: THREE.Vector3) => void
}

export default function Player({ onPositionChange }: PlayerProps) {
  const groupRef = useRef<THREE.Group>(null)
  const keys = useRef({ w: false, a: false, s: false, d: false })
  const facingAngle = useRef(0)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const k = e.key.toLowerCase()
      if (k in keys.current) keys.current[k as keyof typeof keys.current] = true
    }
    function onKeyUp(e: KeyboardEvent) {
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
    const dir = new THREE.Vector3()

    if (w) { dir.x -= 1; dir.z -= 1 }
    if (s) { dir.x += 1; dir.z += 1 }
    if (a) { dir.x -= 1; dir.z += 1 }
    if (d) { dir.x += 1; dir.z -= 1 }

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
      {/* Ground marker */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[0.18, 0.28, 32]} />
        <meshBasicMaterial color="#00ff88" side={THREE.DoubleSide} transparent opacity={0.8} />
      </mesh>

      {/* Body */}
      <mesh position={[0, 0.32, 0]}>
        <capsuleGeometry args={[0.1, 0.25, 8, 16]} />
        <meshStandardMaterial color="#3366cc" />
      </mesh>

      {/* Head */}
      <mesh position={[0, 0.62, 0]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color="#ffcc88" />
      </mesh>

      {/* Small spotlight above */}
      <pointLight position={[0, 1.5, 0]} color="#ffffff" intensity={2} distance={5} />
    </group>
  )
}
