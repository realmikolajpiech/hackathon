import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'

const LERP_SPEED = 3

interface FollowCameraProps {
  target: THREE.Vector3
  controlsRef?: React.RefObject<OrbitControlsImpl | null>
}

export default function FollowCamera({ target, controlsRef }: FollowCameraProps) {
  const { camera } = useThree()
  const smoothTarget = useRef(new THREE.Vector3())
  const camOffset = useRef<THREE.Vector3 | null>(null)

  useFrame((_, delta) => {
    smoothTarget.current.lerp(target, Math.min(1, LERP_SPEED * delta))

    if (controlsRef?.current) {
      controlsRef.current.target.copy(smoothTarget.current)
    } else {
      // No OrbitControls (interior scene): move camera directly at a fixed offset
      if (!camOffset.current) {
        camOffset.current = camera.position.clone().sub(smoothTarget.current)
      }
      camera.position.copy(smoothTarget.current).add(camOffset.current)
      camera.lookAt(smoothTarget.current)
    }
  })

  return null
}
