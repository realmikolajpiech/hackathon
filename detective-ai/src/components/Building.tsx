import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
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

// Kenney buildings are ~1 unit wide base. scale=1 keeps them at native size.
// Roads are also 1-unit tiles. Everything at scale=1 is consistent.
const BUILDING_SCALE = 1

const ALL_URLS = [...new Set(Object.values(BUILDING_MODELS))]
ALL_URLS.forEach((url) => useGLTF.preload(url))

function GLBModel({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  const cloned = useMemo(() => scene.clone(true), [scene])
  return <primitive object={cloned} scale={BUILDING_SCALE} />
}

interface BuildingProps {
  type: string
  position: [number, number, number]
  npcId: string | null
  onClick?: () => void
}

export default function Building({ type, position, npcId, onClick }: BuildingProps) {
  const phase = useGameStore((s) => s.phase)
  const url = BUILDING_MODELS[type] ?? BUILDING_MODELS.office
  const neonColor = NEON_COLORS[type] ?? '#ffffff'
  const isInteractable = npcId !== null && phase === 'city'

  return (
    <group position={position} onClick={isInteractable ? onClick : undefined}>
      <GLBModel url={url} />

      <pointLight
        position={[0, 4, 0]}
        color={neonColor}
        intensity={isInteractable ? 8 : 2}
        distance={isInteractable ? 10 : 5}
      />

      {isInteractable && (
        <mesh position={[0, 2, 0]} onClick={onClick} visible={false}>
          <boxGeometry args={[3, 6, 3]} />
        </mesh>
      )}
    </group>
  )
}
