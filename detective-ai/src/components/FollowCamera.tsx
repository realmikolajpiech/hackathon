import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const OFFSET = new THREE.Vector3(10, 10, 10)
const LERP_SPEED = 3

interface FollowCameraProps {
  target: THREE.Vector3
}

export default function FollowCamera({ target }: FollowCameraProps) {
  const { camera } = useThree()
  const smoothTarget = useRef(new THREE.Vector3())

  useFrame((_, delta) => {
    smoothTarget.current.lerp(target, Math.min(1, LERP_SPEED * delta))

    camera.position.copy(smoothTarget.current).add(OFFSET)
    camera.lookAt(smoothTarget.current)
  })

  return null
}
