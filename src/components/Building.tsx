import { useGLTF } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'
import { useGameStore } from '../store/gameStore'

const BUILDING_MODELS: Record<string, string> = {
  bar:        '/models/industrial/building-d.glb',
  warehouse:  '/models/industrial/building-a.glb',
  factory:    '/models/industrial/building-b.glb',
  industrial: '/models/industrial/building-c.glb',
  club:       '/models/industrial/building-e.glb',
  apartments: '/models/commercial/building-a.glb',
  office:     '/models/commercial/building-skyscraper-a.glb',
  police:     '/models/commercial/building-c.glb',
  restaurant: '/models/commercial/building-h.glb',
  hotel:      '/models/commercial/building-skyscraper-b.glb',
  museum:     '/models/commercial/building-e.glb',
  shop:       '/models/commercial/building-b.glb',
  hospital:   '/models/commercial/building-f.glb',
}

export const NEON_COLORS: Record<string, string> = {
  bar:        '#ff0055',
  warehouse:  '#ff6600',
  factory:    '#ff3300',
  industrial: '#ff8800',
  club:       '#ff00aa',
  apartments: '#0088ff',
  office:     '#00ff88',
  police:     '#00ccff',
  restaurant: '#ffaa00',
  hotel:      '#cc00ff',
  museum:     '#ffdd00',
  shop:       '#00ffcc',
  hospital:   '#ff66aa',
}

const ALL_URLS = [...new Set(Object.values(BUILDING_MODELS))]
ALL_URLS.forEach((url) => useGLTF.preload(url))

interface BuildingProps {
  type: string
  position: [number, number, number]
  npcId: string | null
  onClick?: () => void
}

export default function Building({ type, position, npcId, onClick }: BuildingProps) {
  const phase = useGameStore((s) => s.phase)
  const url = BUILDING_MODELS[type] ?? BUILDING_MODELS.office
  const { scene } = useGLTF(url)
  const isInteractable = npcId !== null && phase === 'city'

  // Deep-clone the scene so we own the materials and can modify them freely
  const cloned = useMemo(() => {
    const clone = scene.clone(true)
    clone.traverse((child) => {
      const mesh = child as THREE.Mesh
      if (!mesh.isMesh) return
      mesh.castShadow = true
      mesh.receiveShadow = true
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      mats.forEach((m) => {
        const mat = (m as THREE.MeshStandardMaterial).clone()
        if (!mat.color) return
        const { r, g, b } = mat.color
        const brightness = (r + g + b) / 3
        if (brightness > 0.03 && brightness < 0.5) {
          mat.color = new THREE.Color('#aaddff')
          mat.emissive = new THREE.Color('#aaddff')
          mat.emissiveIntensity = 20.0
          mat.toneMapped = false
        }
        if (Array.isArray(mesh.material)) {
          const idx = (mesh.material as THREE.Material[]).indexOf(m as THREE.Material)
          ;(mesh.material as THREE.Material[])[idx] = mat
        } else {
          mesh.material = mat
        }
      })
    })
    return clone
  }, [scene])

  return (
    <group position={position} onClick={isInteractable ? onClick : undefined}>
      <primitive object={cloned} />
      {/* Single soft interior light — illuminates street below windows */}

      {isInteractable && (
        <mesh position={[0, 2, 0]} onClick={onClick} visible={false}>
          <boxGeometry args={[3, 6, 3]} />
        </mesh>
      )}
    </group>
  )
}
