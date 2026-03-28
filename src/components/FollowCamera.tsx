import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'

const SMOOTH_FACTOR = 5

interface FollowCameraProps {
  target: THREE.Vector3
  /** When provided, camera positioning is delegated to OrbitControls */
  controlsRef?: React.RefObject<OrbitControlsImpl | null>
  /** Fixed-camera offset from the target (used when no OrbitControls) */
  offset?: [number, number, number]
}

export default function FollowCamera({
  target,
  controlsRef,
  offset = [10, 10, 10],
}: FollowCameraProps) {
  const smoothTarget = useRef(new THREE.Vector3())
  const prevSmooth = useRef(new THREE.Vector3())
  const delta = useRef(new THREE.Vector3())
  const initialized = useRef(false)

  useFrame((state, dt) => {
    if (!initialized.current) {
      smoothTarget.current.copy(target)
      prevSmooth.current.copy(target)
      initialized.current = true
    }

    prevSmooth.current.copy(smoothTarget.current)
    const t = 1 - Math.exp(-SMOOTH_FACTOR * dt)
    smoothTarget.current.lerp(target, t)

    delta.current.subVectors(smoothTarget.current, prevSmooth.current)

    if (controlsRef?.current) {
      controlsRef.current.target.add(delta.current)
      state.camera.position.add(delta.current)
    } else {
      state.camera.position.set(
        smoothTarget.current.x + offset[0],
        smoothTarget.current.y + offset[1],
        smoothTarget.current.z + offset[2],
      )
      state.camera.lookAt(smoothTarget.current)
    }
  })

  return null
}
