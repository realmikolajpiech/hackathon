import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'

interface WallBounds {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

interface FollowCameraProps {
  target: THREE.Vector3
  controlsRef?: React.RefObject<OrbitControlsImpl | null>
  offset?: [number, number, number]
  wallBounds?: WallBounds
  targetYOffset?: number
}

const _dir = new THREE.Vector3()
const _adjusted = new THREE.Vector3()

export default function FollowCamera({
  target,
  controlsRef,
  offset,
  wallBounds,
  targetYOffset = 1,
}: FollowCameraProps) {
  const _orbitOffset = useRef(new THREE.Vector3())
  const _fixedOffset = useRef<THREE.Vector3 | null>(null)

  useFrame((state) => {
    _adjusted.copy(target)
    _adjusted.y += targetYOffset

    if (controlsRef?.current) {
      _orbitOffset.current.subVectors(state.camera.position, controlsRef.current.target)
      controlsRef.current.target.copy(_adjusted)
      state.camera.position.copy(_adjusted).add(_orbitOffset.current)
    } else {
      if (!_fixedOffset.current) {
        _fixedOffset.current = offset
          ? new THREE.Vector3(...offset)
          : state.camera.position.clone().sub(_adjusted)
      }
      state.camera.position.copy(_adjusted).add(_fixedOffset.current)
      state.camera.lookAt(_adjusted)
    }

    if (wallBounds) {
      const cam = state.camera.position
      const b = wallBounds

      if (cam.x < b.minX || cam.x > b.maxX || cam.z < b.minZ || cam.z > b.maxZ) {
        _dir.subVectors(cam, _adjusted)
        const len = _dir.length()
        if (len < 0.01) return
        _dir.divideScalar(len)

        let maxT = len

        if (_dir.x !== 0) {
          const tLo = (b.minX - _adjusted.x) / _dir.x
          const tHi = (b.maxX - _adjusted.x) / _dir.x
          const tFar = Math.max(tLo, tHi)
          if (tFar > 0) maxT = Math.min(maxT, tFar)
        }
        if (_dir.z !== 0) {
          const tLo = (b.minZ - _adjusted.z) / _dir.z
          const tHi = (b.maxZ - _adjusted.z) / _dir.z
          const tFar = Math.max(tLo, tHi)
          if (tFar > 0) maxT = Math.min(maxT, tFar)
        }

        if (maxT < len) {
          cam.copy(_adjusted).addScaledVector(_dir, Math.max(maxT, 0.5))
        }
      }
    }
  })

  return null
}
