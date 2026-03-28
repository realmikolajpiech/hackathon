import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'

const SMOOTH_FACTOR = 5

interface FollowCameraProps {
  target: THREE.Vector3
  controlsRef?: React.RefObject<OrbitControlsImpl | null>
  offset?: [number, number, number]
}

export default function FollowCamera({
  target,
  controlsRef,
  offset,
}: FollowCameraProps) {
  const smoothTarget = useRef(new THREE.Vector3())
  const initialized = useRef(false)
  const _camOffset = useRef(new THREE.Vector3())
  const _fixedOffset = useRef<THREE.Vector3 | null>(null)

  useFrame((state, dt) => {
    if (!initialized.current) {
      smoothTarget.current.copy(target)
      initialized.current = true
    }

    const t = 1 - Math.exp(-SMOOTH_FACTOR * dt)
    smoothTarget.current.lerp(target, t)

    if (controlsRef?.current) {
      _camOffset.current.subVectors(state.camera.position, controlsRef.current.target)
      controlsRef.current.target.copy(smoothTarget.current)
      state.camera.position.copy(smoothTarget.current).add(_camOffset.current)
    } else {
      // Capture the initial camera→target offset on first frame,
      // or use the explicit offset prop if provided
      if (!_fixedOffset.current) {
        _fixedOffset.current = offset
          ? new THREE.Vector3(...offset)
          : state.camera.position.clone().sub(smoothTarget.current)
      }
      state.camera.position.copy(smoothTarget.current).add(_fixedOffset.current)
      state.camera.lookAt(smoothTarget.current)
    }
  }, 1)

  return null
}
