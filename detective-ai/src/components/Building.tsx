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

const BUILDING_COLORS: Record<string, string> = {
  bar: '#993333', warehouse: '#555555', factory: '#886644',
  industrial: '#555566', club: '#883377', apartments: '#445588',
  office: '#448844', police: '#336699', restaurant: '#887744',
  hotel: '#774488', museum: '#888844', shop: '#448888', hospital: '#884466',
}

const SCALE = 2

const ALL_URLS = [...new Set(Object.values(BUILDING_MODELS))]
ALL_URLS.forEach((url) => useGLTF.preload(url))

// Fallback box that is ALWAYS visible (uses emissive so it glows without light)
function FallbackBox({ color, neonColor, height }: { color: string; neonColor: string; height: number }) {
  return (
    <group>
      {/* Main body */}
      <mesh position={[0, height / 2, 0]} castShadow>
        <boxGeometry args={[SCALE * 1.4, height, SCALE * 1.4]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {/* Neon trim on top */}
      <mesh position={[0, height + 0.06, 0]}>
        <boxGeometry args={[SCALE * 1.5, 0.12, SCALE * 1.5]} />
        <meshBasicMaterial color={neonColor} />
      </mesh>
      {/* Glowing windows */}
      {Array.from({ length: Math.floor(height / 1.2) }).map((_, i) => (
        <group key={i}>
          <mesh position={[SCALE * 0.71, 0.6 + i * 1.2, 0]}>
            <boxGeometry args={[0.04, 0.4, 0.5]} />
            <meshBasicMaterial color="#ffcc66" />
          </mesh>
          <mesh position={[-SCALE * 0.71, 0.6 + i * 1.2, 0]}>
            <boxGeometry args={[0.04, 0.4, 0.5]} />
            <meshBasicMaterial color="#ffcc66" />
          </mesh>
          <mesh position={[0, 0.6 + i * 1.2, SCALE * 0.71]}>
            <boxGeometry args={[0.5, 0.4, 0.04]} />
            <meshBasicMaterial color="#ffcc66" />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function GLBModel({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  const cloned = useMemo(() => scene.clone(true), [scene])
  return <primitive object={cloned} scale={SCALE} />
}

interface BuildingProps {
  type: string
  position: [number, number, number]
  npcId: string | null
  onClick?: () => void
  useGLB?: boolean
}

export default function Building({ type, position, npcId, onClick, useGLB = true }: BuildingProps) {
  const phase = useGameStore((s) => s.phase)
  const url = BUILDING_MODELS[type] ?? BUILDING_MODELS.office
  const neonColor = NEON_COLORS[type] ?? '#ffffff'
  const color = BUILDING_COLORS[type] ?? '#555'
  const isInteractable = npcId !== null && phase === 'city'
  const height = type === 'hotel' || type === 'office' ? 8 : type === 'apartments' ? 6 : 4

  return (
    <group position={position} onClick={isInteractable ? onClick : undefined}>
      {useGLB ? (
        <GLBModel url={url} />
      ) : (
        <FallbackBox color={color} neonColor={neonColor} height={height} />
      )}

      {/* Neon glow */}
      <pointLight
        position={[0, height + 1, 0]}
        color={neonColor}
        intensity={isInteractable ? 10 : 3}
        distance={isInteractable ? 16 : 8}
      />

      {/* Clickable hitbox */}
      {isInteractable && (
        <mesh position={[0, height / 2, 0]} onClick={onClick} visible={false}>
          <boxGeometry args={[SCALE * 3, height + 2, SCALE * 3]} />
        </mesh>
      )}
    </group>
  )
}
