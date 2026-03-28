import { useRef, useEffect, useMemo, Suspense } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js'
import { SCALE } from '../config/modelScales'
import { resolveCollisions, type Collider } from '../utils/collisions'

const MODEL_URL = '/models/characters/character-male-a.glb'
useGLTF.preload(MODEL_URL)

const MOVE_SPEED = 3.2
const SPRINT_MULT = 1.6
const TURN_SPEED = 12

export type { Collider }

interface PlayerProps {
  onPositionChange?: (pos: THREE.Vector3) => void
  bounds?: number
  startPosition?: [number, number, number]
  playerLight?: boolean
  colliders?: readonly Collider[]
}

const _fwd = new THREE.Vector3()
const _rgt = new THREE.Vector3()
const _dir = new THREE.Vector3()
const _up = new THREE.Vector3(0, 1, 0)

interface CharacterBones {
  armLeft: THREE.Bone | null
  armRight: THREE.Bone | null
  legLeft: THREE.Bone | null
  legRight: THREE.Bone | null
  torso: THREE.Bone | null
  head: THREE.Bone | null
}

function CharacterModel({ bonesRef }: { bonesRef: React.MutableRefObject<CharacterBones> }) {
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

  useEffect(() => {
    const bones: CharacterBones = {
      armLeft: null, armRight: null,
      legLeft: null, legRight: null,
      torso: null, head: null,
    }
    clone.traverse((child) => {
      if (!(child as THREE.Bone).isBone) return
      switch (child.name) {
        case 'arm-left':  bones.armLeft = child as THREE.Bone; break
        case 'arm-right': bones.armRight = child as THREE.Bone; break
        case 'leg-left':  bones.legLeft = child as THREE.Bone; break
        case 'leg-right': bones.legRight = child as THREE.Bone; break
        case 'torso':     bones.torso = child as THREE.Bone; break
        case 'head':      bones.head = child as THREE.Bone; break
      }
    })
    if (bones.armLeft)  { bones.armLeft.rotation.z  = -0.8; bones.armLeft.scale.setScalar(0.6) }
    if (bones.armRight) { bones.armRight.rotation.z =  0.8; bones.armRight.scale.setScalar(0.6) }
    bonesRef.current = bones
  }, [clone, bonesRef])

  return <primitive object={clone} scale={SCALE.character} />
}

export default function Player({
  onPositionChange,
  bounds,
  startPosition,
  playerLight,
  colliders,
}: PlayerProps) {
  const { camera } = useThree()
  const groupRef = useRef<THREE.Group>(null!)
  const modelRef = useRef<THREE.Group>(null!)
  const input = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
  })
  const facingAngle = useRef(0)
  const walkPhase = useRef(0)
  const bonesRef = useRef<CharacterBones>({
    armLeft: null, armRight: null,
    legLeft: null, legRight: null,
    torso: null, head: null,
  })

  useEffect(() => {
    if (groupRef.current && startPosition) {
      groupRef.current.position.set(...startPosition)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

    const isMoving = _dir.lengthSq() > 0.001

    if (isMoving) {
      _dir.normalize()
      const speed = sprint ? MOVE_SPEED * SPRINT_MULT : MOVE_SPEED
      g.position.addScaledVector(_dir, speed * dt)
      facingAngle.current = Math.atan2(_dir.x, _dir.z)
    }

    if (bounds !== undefined) {
      g.position.x = THREE.MathUtils.clamp(g.position.x, -bounds, bounds)
      g.position.z = THREE.MathUtils.clamp(g.position.z, -bounds, bounds)
    }

    if (colliders && colliders.length > 0) {
      const [rx, rz] = resolveCollisions(g.position.x, g.position.z, colliders)
      g.position.x = rx
      g.position.z = rz
    }

    let angleDiff = facingAngle.current - g.rotation.y
    angleDiff = THREE.MathUtils.euclideanModulo(angleDiff + Math.PI, Math.PI * 2) - Math.PI
    g.rotation.y += angleDiff * Math.min(1, TURN_SPEED * dt)

    // Skeletal + procedural animation
    const m = modelRef.current
    const bones = bonesRef.current
    if (m) {
      if (isMoving) {
        const freq = sprint ? 16 : 12
        walkPhase.current += dt * freq
        const phase = walkPhase.current
        const s = SCALE.character

        // Body bob (+ base offset to keep feet above road surface)
        m.position.y = 0.08 + Math.abs(Math.sin(phase)) * 0.06 * s

        // Bone animation
        if (bones.legLeft)  bones.legLeft.rotation.x  =  Math.sin(phase) * 0.45
        if (bones.legRight) bones.legRight.rotation.x = -Math.sin(phase) * 0.45
        if (bones.armLeft)  bones.armLeft.rotation.x  = -Math.sin(phase) * 0.35
        if (bones.armRight) bones.armRight.rotation.x =  Math.sin(phase) * 0.35
        if (bones.torso)    bones.torso.rotation.y    =  Math.sin(phase) * 0.04
        if (bones.head)     bones.head.rotation.y     = -Math.sin(phase) * 0.03
      } else {
        walkPhase.current += dt * 2
        const phase = walkPhase.current
        const s = SCALE.character

        // Idle breathing (+ base offset)
        m.position.y = 0.08 + (Math.sin(phase) * 0.5 + 0.5) * 0.012 * s

        // Smoothly return bones to rest
        if (bones.legLeft)  bones.legLeft.rotation.x  *= 0.85
        if (bones.legRight) bones.legRight.rotation.x *= 0.85
        if (bones.armLeft)  bones.armLeft.rotation.x  *= 0.85
        if (bones.armRight) bones.armRight.rotation.x *= 0.85
        if (bones.torso) {
          bones.torso.rotation.y *= 0.85
          bones.torso.rotation.x = Math.sin(phase) * 0.01
        }
        if (bones.head) bones.head.rotation.y *= 0.9
      }
    }

    onPositionChange?.(g.position)
  })

  return (
    <group ref={groupRef}>
      <group ref={modelRef}>
        <Suspense fallback={
          <mesh position={[0, 0.5 * SCALE.character, 0]}>
            <capsuleGeometry args={[0.15 * SCALE.character, 0.4 * SCALE.character, 8, 16]} />
            <meshLambertMaterial color="#4488cc" />
          </mesh>
        }>
          <CharacterModel bonesRef={bonesRef} />
        </Suspense>
      </group>

      {playerLight && (
        <pointLight position={[0, 2.5, 0]} color="#ffffee" intensity={4} distance={6} />
      )}
    </group>
  )
}
