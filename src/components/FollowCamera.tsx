import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'

interface FollowCameraProps {
  target: THREE.Vector3
  controlsRef?: React.RefObject<OrbitControlsImpl | null>
}

export default function FollowCamera({
  target,
  controlsRef,
  offset,
}: FollowCameraProps) {
  const _orbitOffset = useRef(new THREE.Vector3())
  const _fixedOffset = useRef<THREE.Vector3 | null>(null)

  useFrame((state) => {
    if (controlsRef?.current) {
      _orbitOffset.current.subVectors(state.camera.position, controlsRef.current.target)
      controlsRef.current.target.copy(target)
      state.camera.position.copy(target).add(_orbitOffset.current)
    } else {
      if (!_fixedOffset.current) {
        _fixedOffset.current = offset
          ? new THREE.Vector3(...offset)
          : state.camera.position.clone().sub(target)
      }
      state.camera.position.copy(target).add(_fixedOffset.current)
      state.camera.lookAt(target)
    }
  })

  return null
}
