import { useRef } from 'react'
import { Mesh } from 'three'
import { useGameStore } from '../store/gameStore'

interface BuildingProps {
  type: string
  position: [number, number, number]
  npcId: string | null
  onClick?: () => void
}

const BUILDING_COLORS: Record<string, string> = {
  bar: '#8B0000',
  apartments: '#1a1a4e',
  police: '#003366',
  warehouse: '#2d2d2d',
  office: '#1a3a1a',
}

const NEON_COLORS: Record<string, string> = {
  bar: '#ff0055',
  apartments: '#0088ff',
  police: '#00ffff',
  warehouse: '#ff6600',
  office: '#00ff88',
}

const BUILDING_HEIGHTS: Record<string, number> = {
  bar: 1.2,
  apartments: 2.5,
  police: 1.8,
  warehouse: 1.0,
  office: 2.0,
}

export default function Building({ type, position, npcId, onClick }: BuildingProps) {
  const meshRef = useRef<Mesh>(null)
  const phase = useGameStore((s) => s.phase)

  const height = BUILDING_HEIGHTS[type] ?? 1.5
  const color = BUILDING_COLORS[type] ?? '#333'
  const neonColor = NEON_COLORS[type] ?? '#ffffff'
  const isInteractable = npcId !== null && phase === 'city'

  return (
    <group position={position} onClick={isInteractable ? onClick : undefined}>
      {/* Main building body */}
      <mesh ref={meshRef} position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.4, height, 1.4]} />
        <meshStandardMaterial color={color} roughness={0.8} metalness={0.2} />
      </mesh>

      {/* Neon trim on top */}
      <mesh position={[0, height + 0.05, 0]}>
        <boxGeometry args={[1.5, 0.08, 1.5]} />
        <meshStandardMaterial
          color={neonColor}
          emissive={neonColor}
          emissiveIntensity={isInteractable ? 2.5 : 0.8}
        />
      </mesh>

      {/* Windows */}
      {Array.from({ length: Math.floor(height * 1.5) }).map((_, i) => (
        <mesh key={i} position={[0.71, 0.4 + i * 0.6, 0]} castShadow>
          <boxGeometry args={[0.02, 0.25, 0.3]} />
          <meshStandardMaterial
            color="#ffff99"
            emissive="#ffaa00"
            emissiveIntensity={Math.random() > 0.3 ? 1.5 : 0.1}
          />
        </mesh>
      ))}

      {/* Neon point light */}
      {isInteractable && (
        <pointLight
          position={[0, height + 0.5, 0]}
          color={neonColor}
          intensity={3}
          distance={4}
        />
      )}

      {/* Building label */}
      {isInteractable && (
        <mesh position={[0, height + 0.5, 0.8]}>
          <planeGeometry args={[1.2, 0.3]} />
          <meshStandardMaterial
            color={neonColor}
            emissive={neonColor}
            emissiveIntensity={3}
            transparent
            opacity={0.9}
          />
        </mesh>
      )}
    </group>
  )
}
