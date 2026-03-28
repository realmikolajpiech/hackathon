import { useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

useGLTF.preload('/models/characters/character-male-a.glb')

const SPEED = 6

interface PlayerProps {
  onPositionChange?: (pos: THREE.Vector3) => void
}

export default function Player({ onPositionChange }: PlayerProps) {
  const { scene } = useGLTF('/models/characters/character-male-a.glb')
  const cloned = useMemo(() => scene.clone(true), [scene])

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

    // Isometric: camera at [10,10,10]. Forward = (-1,0,-1), Right = (1,0,-1)
    if (w) { dir.x -= 1; dir.z -= 1 }
    if (s) { dir.x += 1; dir.z += 1 }
    if (a) { dir.x -= 1; dir.z += 1 }
    if (d) { dir.x += 1; dir.z -= 1 }

    if (dir.lengthSq() > 0) {
      dir.normalize()
      groupRef.current.position.addScaledVector(dir, SPEED * delta)
      facingAngle.current = Math.atan2(dir.x, dir.z)
    }

    // Smooth rotation
    const cur = groupRef.current.rotation.y
    let diff = facingAngle.current - cur
    diff = ((diff + Math.PI) % (Math.PI * 2)) - Math.PI
    groupRef.current.rotation.y += diff * Math.min(1, 12 * delta)

    onPositionChange?.(groupRef.current.position)
  })

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <primitive object={cloned} scale={1} />
      <pointLight position={[0, 3, 0]} color="#ffffee" intensity={3} distance={8} />
    </group>
  )
}
