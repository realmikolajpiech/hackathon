import { useRef, useEffect, useMemo, Suspense } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js'
import { SCALE } from '../config/modelScales'

const MODEL_URL = '/models/characters/character-male-a.glb'
useGLTF.preload(MODEL_URL)

const MOVE_SPEED = 5
const SPRINT_MULT = 1.8
const TURN_SPEED = 12

interface PlayerProps {
  onPositionChange?: (pos: THREE.Vector3) => void
  /** Clamp position within [-bounds, bounds] on X and Z */
  bounds?: number
  startPosition?: [number, number, number]
  /** Attach a subtle overhead light to the player */
  playerLight?: boolean
}

const _fwd = new THREE.Vector3()
const _rgt = new THREE.Vector3()
const _dir = new THREE.Vector3()
const _up = new THREE.Vector3(0, 1, 0)

/** Loads and renders just the character model — safe to suspend */
function CharacterModel() {
  const { scene } = useGLTF(MODEL_URL)
  const clone = useMemo(() => {
    const c = SkeletonUtils.clone(scene)
    c.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
    return c
  }, [scene])
  return <primitive object={clone} scale={SCALE.character} />
}

export default function Player({
  onPositionChange,
  bounds,
  startPosition,
  playerLight,
}: PlayerProps) {
  const { camera } = useThree()
  const groupRef = useRef<THREE.Group>(null!)
  const input = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
  })
  const facingAngle = useRef(0)

  useEffect(() => {
    if (groupRef.current && startPosition) {
      groupRef.current.position.set(...startPosition)
    }
  }, [])

  useEffect(() => {
    const apply = (key: string, pressed: boolean) => {
      switch (key) {
        case 'w': case 'arrowup':    input.current.forward  = pressed; break
        case 's': case 'arrowdown':  input.current.backward = pressed; break
        case 'a': case 'arrowleft':  input.current.left     = pressed; break
        case 'd': case 'arrowright': input.current.right    = pressed; break
        case 'shift':                input.current.sprint   = pressed; break
      }
    }
    const onDown = (e: KeyboardEvent) => apply(e.key.toLowerCase(), true)
    const onUp   = (e: KeyboardEvent) => apply(e.key.toLowerCase(), false)
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  }, [])

  useFrame((_, dt) => {
    const g = groupRef.current
    if (!g) return

    const { forward, backward, left, right, sprint } = input.current

    camera.getWorldDirection(_fwd)
    _fwd.y = 0
    if (_fwd.lengthSq() < 0.001) return
    _fwd.normalize()
    _rgt.crossVectors(_fwd, _up).normalize()

    _dir.set(0, 0, 0)
    if (forward)  _dir.add(_fwd)
    if (backward) _dir.sub(_fwd)
    if (right)    _dir.add(_rgt)
    if (left)     _dir.sub(_rgt)

    if (_dir.lengthSq() > 0.001) {
      _dir.normalize()
      const speed = sprint ? MOVE_SPEED * SPRINT_MULT : MOVE_SPEED
      g.position.addScaledVector(_dir, speed * dt)
      facingAngle.current = Math.atan2(_dir.x, _dir.z)
    }

    if (bounds !== undefined) {
      g.position.x = THREE.MathUtils.clamp(g.position.x, -bounds, bounds)
      g.position.z = THREE.MathUtils.clamp(g.position.z, -bounds, bounds)
    }

    let angleDiff = facingAngle.current - g.rotation.y
    angleDiff = THREE.MathUtils.euclideanModulo(angleDiff + Math.PI, Math.PI * 2) - Math.PI
    g.rotation.y += angleDiff * Math.min(1, TURN_SPEED * dt)

    onPositionChange?.(g.position)
  })

  return (
    <group ref={groupRef}>
      {/* 3D model — loads async, won't block the group from rendering */}
      <Suspense fallback={
        <mesh position={[0, 0.5 * SCALE.character, 0]}>
          <capsuleGeometry args={[0.15 * SCALE.character, 0.4 * SCALE.character, 8, 16]} />
          <meshLambertMaterial color="#4488cc" />
        </mesh>
      }>
        <CharacterModel />
      </Suspense>

      {/* Ground ring marker */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.3 * SCALE.character, 0.5 * SCALE.character, 24]} />
        <meshBasicMaterial color="#00ff88" side={THREE.DoubleSide} transparent opacity={0.8} />
      </mesh>

      {playerLight && (
        <pointLight position={[0, 2.5, 0]} color="#ffffee" intensity={4} distance={6} />
      )}
    </group>
  )
}
