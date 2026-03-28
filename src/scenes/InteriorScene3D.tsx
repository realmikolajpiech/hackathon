import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, Html, OrbitControls } from '@react-three/drei'
import { Suspense, useState, useRef, useMemo, useEffect } from 'react'
import * as THREE from 'three'
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import Player from '../components/Player'
import FollowCamera from '../components/FollowCamera'
import DialogBox from '../components/DialogBox'
import VoiceUI from '../components/VoiceUI'
import Notebook from '../components/Notebook'
import Inventory from '../components/Inventory'
import { useGameStore } from '../store/gameStore'
import type { InteriorObject } from '../store/gameStore'
import { SCALE } from '../config/modelScales'
import type { Collider } from '../utils/collisions'

// ─── Asset paths ──────────────────────────────────────────────────────────────

const M = {
  shelfBags:      '/models/interiors/market/shelf-bags.glb',
  shelfBoxes:     '/models/interiors/market/shelf-boxes.glb',
  cashRegister:   '/models/interiors/market/cash-register.glb',
  displayFruit:   '/models/interiors/market/display-fruit.glb',
  displayBread:   '/models/interiors/market/display-bread.glb',
  column:         '/models/interiors/market/column.glb',
  shoppingCart:   '/models/interiors/market/shopping-cart.glb',
  freezer:        '/models/interiors/market/freezer.glb',
  barrel:         '/models/interiors/food/barrel.glb',
  cocktail:       '/models/interiors/food/cocktail.glb',
  glassWine:      '/models/interiors/food/glass-wine.glb',
  glass:          '/models/interiors/food/glass.glb',
  bottleK:        '/models/interiors/food/bottle-ketchup.glb',
  bottleO:        '/models/interiors/food/bottle-oil.glb',
  burger:         '/models/interiors/food/burger.glb',
  bowl:           '/models/interiors/food/bowl-soup.glb',
  can:            '/models/interiors/food/can.glb',
  cake:           '/models/interiors/food/cake.glb',
  sodaGlass:      '/models/interiors/food/soda-glass.glb',
  sodaBottle:     '/models/interiors/food/soda-bottle.glb',
  cupcake:        '/models/interiors/food/cupcake.glb',
}

// Preload all models
Object.values(M).forEach((url) => useGLTF.preload(url))
useGLTF.preload('/models/characters/character-male-a.glb')
useGLTF.preload('/models/characters/character-male-b.glb')
useGLTF.preload('/models/characters/character-male-c.glb')
useGLTF.preload('/models/characters/character-female-a.glb')
useGLTF.preload('/models/characters/character-female-b.glb')

// ─── Neon + floor colors per building type ────────────────────────────────────

const NEON: Record<string, string> = {
  bar: '#ff0055', club: '#ff00aa', restaurant: '#ffaa00',
  shop: '#00ffcc', warehouse: '#ff6600', factory: '#ff3300',
  industrial: '#ff8800', office: '#00ff88', police: '#00ccff',
  hotel: '#cc00ff', museum: '#ffdd00', hospital: '#ff66aa', apartments: '#0088ff',
}

const FLOOR_COLOR: Record<string, string> = {
  bar: '#2a1a12', club: '#12121a', restaurant: '#2a1a0a',
  shop: '#1a1a1a', warehouse: '#1a1a12', factory: '#111118',
  industrial: '#151510', office: '#1a1a20', police: '#101820',
  hotel: '#1a1218', museum: '#141218', hospital: '#101a18', apartments: '#181518',
}

const WALL_COLOR: Record<string, string> = {
  bar: '#1a0e08', club: '#0e0e1a', restaurant: '#1e130a',
  shop: '#151515', warehouse: '#131310', factory: '#0e0e14',
  industrial: '#121210', office: '#141418', police: '#0a1218',
  hotel: '#150e14', museum: '#100e14', hospital: '#0a141a', apartments: '#121018',
}

// ─── Building decor config ────────────────────────────────────────────────────

interface DecorItem {
  model: string
  pos: [number, number, number]
  rot?: number
  scale?: number
}

const BUILDING_DECOR: Record<string, DecorItem[]> = {
  bar: [
    { model: M.barrel,    pos: [-2.8, 0, -2.8] },
    { model: M.barrel,    pos: [-2.0, 0, -2.8] },
    { model: M.barrel,    pos: [2.8,  0, -2.8] },
    { model: M.column,    pos: [-0.6, 0, -2.6] },
    { model: M.column,    pos: [ 0.6, 0, -2.6] },
    { model: M.cocktail,  pos: [-1.5, 0, -1.8], scale: 2 },
    { model: M.glassWine, pos: [ 0.0, 0, -1.8], scale: 2 },
    { model: M.cocktail,  pos: [ 1.5, 0, -1.8], scale: 2 },
    { model: M.sodaBottle,pos: [ 2.5, 0, -1.2], scale: 1.5 },
    { model: M.glass,     pos: [-2.5, 0, -1.2], scale: 2 },
  ],
  club: [
    { model: M.column, pos: [-2.2, 0, -2.2] },
    { model: M.column, pos: [ 2.2, 0, -2.2] },
    { model: M.column, pos: [-2.2, 0,  0.0] },
    { model: M.column, pos: [ 2.2, 0,  0.0] },
    { model: M.barrel, pos: [-2.8, 0,  1.5] },
    { model: M.barrel, pos: [ 2.8, 0,  1.5] },
    { model: M.cocktail, pos: [ 0.0, 0, -2.6], scale: 2 },
  ],
  restaurant: [
    { model: M.bowl,    pos: [-1.5, 0, -1.5], scale: 2 },
    { model: M.burger,  pos: [ 1.2, 0, -1.5], scale: 2 },
    { model: M.cake,    pos: [ 0.0, 0, -2.6], scale: 2 },
    { model: M.bottleK, pos: [-2.8, 0, -2.0] },
    { model: M.bottleO, pos: [-2.2, 0, -2.0] },
    { model: M.sodaGlass, pos: [2.5, 0, -2.0], scale: 2 },
    { model: M.column,  pos: [ 2.8, 0, -2.6] },
    { model: M.cupcake, pos: [-2.5, 0,  0.5], scale: 2 },
  ],
  shop: [
    { model: M.shelfBags,   pos: [-2.8, 0, -1.8], rot: Math.PI / 2 },
    { model: M.shelfBoxes,  pos: [-2.8, 0, -0.6], rot: Math.PI / 2 },
    { model: M.shelfBags,   pos: [-2.8, 0,  0.6], rot: Math.PI / 2 },
    { model: M.cashRegister,pos: [ 2.2, 0,  2.2], rot: Math.PI },
    { model: M.displayFruit,pos: [ 0.0, 0, -2.6] },
    { model: M.displayBread,pos: [ 1.5, 0, -2.6] },
    { model: M.shoppingCart,pos: [ 1.8, 0,  2.0] },
    { model: M.freezer,     pos: [ 2.8, 0, -1.0], rot: Math.PI / 2 },
  ],
  warehouse: [
    { model: M.barrel,     pos: [-2.5, 0, -2.8] },
    { model: M.barrel,     pos: [-1.8, 0, -2.8] },
    { model: M.barrel,     pos: [ 1.8, 0, -2.8] },
    { model: M.barrel,     pos: [ 2.5, 0, -2.8] },
    { model: M.shelfBoxes, pos: [-2.8, 0,  0.0], rot: Math.PI / 2 },
    { model: M.shelfBoxes, pos: [-2.8, 0, -1.2], rot: Math.PI / 2 },
    { model: M.shelfBoxes, pos: [ 2.8, 0,  0.0], rot: -Math.PI / 2 },
    { model: M.shelfBoxes, pos: [ 2.8, 0, -1.2], rot: -Math.PI / 2 },
    { model: M.can,        pos: [ 0.0, 0, -2.6], scale: 2 },
  ],
  factory: [
    { model: M.barrel,     pos: [-2.8, 0, -2.0] },
    { model: M.barrel,     pos: [ 2.8, 0, -2.0] },
    { model: M.column,     pos: [-0.6, 0, -2.6] },
    { model: M.column,     pos: [ 0.6, 0, -2.6] },
    { model: M.shelfBoxes, pos: [ 2.8, 0,  0.5], rot: -Math.PI / 2 },
    { model: M.can,        pos: [-2.5, 0,  0.5], scale: 2 },
  ],
  industrial: [
    { model: M.barrel,     pos: [-2.2, 0, -2.8] },
    { model: M.barrel,     pos: [ 2.2, 0, -2.8] },
    { model: M.shelfBoxes, pos: [-2.8, 0, -0.5], rot: Math.PI / 2 },
    { model: M.column,     pos: [ 0.0, 0, -2.6] },
    { model: M.can,        pos: [ 2.5, 0,  0.5], scale: 2 },
  ],
  office: [
    { model: M.shelfBoxes, pos: [-2.8, 0, -1.5], rot: Math.PI / 2 },
    { model: M.shelfBoxes, pos: [-2.8, 0, -0.3], rot: Math.PI / 2 },
    { model: M.column,     pos: [ 2.2, 0, -2.6] },
    { model: M.can,        pos: [ 0.0, 0, -2.6], scale: 2 },
    { model: M.shelfBags,  pos: [ 2.8, 0,  0.5], rot: -Math.PI / 2 },
  ],
  police: [
    { model: M.column,     pos: [-2.2, 0, -2.6] },
    { model: M.column,     pos: [ 2.2, 0, -2.6] },
    { model: M.shelfBoxes, pos: [-2.8, 0, -0.8], rot: Math.PI / 2 },
    { model: M.shelfBoxes, pos: [ 2.8, 0, -0.8], rot: -Math.PI / 2 },
    { model: M.can,        pos: [ 0.0, 0, -2.6], scale: 2 },
  ],
  hospital: [
    { model: M.column,     pos: [-2.6, 0, -2.6] },
    { model: M.column,     pos: [ 2.6, 0, -2.6] },
    { model: M.shelfBags,  pos: [-2.8, 0, -0.5], rot: Math.PI / 2 },
    { model: M.can,        pos: [ 0.0, 0, -2.6], scale: 2 },
    { model: M.sodaBottle, pos: [ 2.5, 0,  0.5], scale: 1.5 },
  ],
  hotel: [
    { model: M.column,     pos: [-2.2, 0, -2.6] },
    { model: M.column,     pos: [ 2.2, 0, -2.6] },
    { model: M.cocktail,   pos: [-1.2, 0, -1.8], scale: 2 },
    { model: M.glassWine,  pos: [ 0.0, 0, -1.8], scale: 2 },
    { model: M.cocktail,   pos: [ 1.2, 0, -1.8], scale: 2 },
    { model: M.cake,       pos: [ 2.8, 0, -1.5], scale: 1.5 },
  ],
  apartments: [
    { model: M.column,     pos: [-2.6, 0, -2.6] },
    { model: M.shelfBoxes, pos: [ 2.8, 0, -1.0], rot: -Math.PI / 2 },
    { model: M.can,        pos: [ 0.0, 0, -2.6], scale: 2 },
    { model: M.sodaGlass,  pos: [-2.5, 0,  0.5], scale: 2 },
  ],
  museum: [
    { model: M.column,      pos: [-1.8, 0, -2.2] },
    { model: M.column,      pos: [ 1.8, 0, -2.2] },
    { model: M.column,      pos: [-2.8, 0,  0.0] },
    { model: M.column,      pos: [ 2.8, 0,  0.0] },
    { model: M.displayFruit,pos: [ 0.0, 0, -2.6] },
    { model: M.displayBread,pos: [-1.5, 0, -2.6] },
  ],
}

// ─── Interactive object positions ─────────────────────────────────────────────

// Positions chosen to avoid overlapping with BUILDING_DECOR (which clusters near walls at z<-2 and |x|>2)
const EXAMINE_POSITIONS: [number, number, number][] = [
  [-1.2, 0, -1.0],
  [ 1.2, 0, -1.0],
  [ 0.0, 0, -0.5],
  [-1.8, 0,  0.6],
  [ 1.8, 0,  0.6],
  [ 0.0, 0,  1.2],
]

// ─── Pick 3D model to represent an examine object ─────────────────────────────

const PROP_POOL = [M.can, M.bottleK, M.barrel, M.bowl, M.shelfBags, M.glassWine, M.sodaBottle]

function pickPropModel(name: string, index: number): string {
  const l = name.toLowerCase()
  if (l.includes('glass') || l.includes('drink') || l.includes('wine')) return M.glassWine
  if (l.includes('cocktail') || l.includes('shot'))                      return M.cocktail
  if (l.includes('barrel') || l.includes('cask') || l.includes('keg'))   return M.barrel
  if (l.includes('bowl') || l.includes('plate') || l.includes('dish'))   return M.bowl
  if (l.includes('can') || l.includes('tin'))                            return M.can
  if (l.includes('bag') || l.includes('box') || l.includes('case'))      return M.shelfBags
  if (l.includes('bottle') || l.includes('flask') || l.includes('vial')) return M.bottleK
  if (l.includes('food') || l.includes('burger') || l.includes('meal'))  return M.burger
  if (l.includes('cake') || l.includes('sweet') || l.includes('pastry')) return M.cupcake
  return PROP_POOL[index % PROP_POOL.length]
}

// ─── GLB Prop ─────────────────────────────────────────────────────────────────

function GLBProp({
  url, position, rotation = 0, scale = 1,
}: {
  url: string
  position: [number, number, number]
  rotation?: number
  scale?: number
}) {
  const { scene } = useGLTF(url)
  const cloned = useMemo(() => {
    const clone = scene.clone(true)
    clone.traverse((node) => {
      const mesh = node as THREE.Mesh
      if (mesh.isMesh) {
        mesh.material = Array.isArray(mesh.material)
          ? mesh.material.map((m) => m.clone())
          : mesh.material.clone()
      }
    })
    return clone
  }, [scene])
  return (
    <primitive
      object={cloned}
      position={position}
      rotation={[0, rotation, 0]}
      scale={scale}
    />
  )
}

// ─── Room ─────────────────────────────────────────────────────────────────────

function InteriorRoom({ buildingType }: { buildingType: string }) {
  const neon      = NEON[buildingType]       ?? '#ffffff'
  const floorCol  = FLOOR_COLOR[buildingType] ?? '#1a1a1a'
  const wallCol   = WALL_COLOR[buildingType]  ?? '#141414'

  return (
    <group>
      {/* Floor */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[8, 0.1, 8]} />
        <meshStandardMaterial color={floorCol} roughness={0.85} metalness={0.05} />
      </mesh>

      {/* Floor grid lines */}
      {[-3,-2,-1,0,1,2,3].map((v) => (
        <group key={v}>
          <mesh position={[v, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.015, 7.8]} />
            <meshBasicMaterial color={neon} transparent opacity={0.08} />
          </mesh>
          <mesh position={[0, 0.001, v]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[7.8, 0.015]} />
            <meshBasicMaterial color={neon} transparent opacity={0.08} />
          </mesh>
        </group>
      ))}

      {/* North wall */}
      <mesh position={[0, 1.25, -3.55]} castShadow receiveShadow>
        <boxGeometry args={[8, 2.5, 0.3]} />
        <meshStandardMaterial color={wallCol} roughness={0.9} />
      </mesh>

      {/* East wall */}
      <mesh position={[3.55, 1.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.3, 2.5, 8]} />
        <meshStandardMaterial color={wallCol} roughness={0.9} />
      </mesh>

      {/* West wall */}
      <mesh position={[-3.55, 1.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.3, 2.5, 8]} />
        <meshStandardMaterial color={wallCol} roughness={0.9} />
      </mesh>

      {/* South wall – left of door */}
      <mesh position={[-2.3, 1.25, 3.55]} castShadow receiveShadow>
        <boxGeometry args={[3.4, 2.5, 0.3]} />
        <meshStandardMaterial color={wallCol} roughness={0.9} />
      </mesh>

      {/* South wall – right of door */}
      <mesh position={[2.3, 1.25, 3.55]} castShadow receiveShadow>
        <boxGeometry args={[3.4, 2.5, 0.3]} />
        <meshStandardMaterial color={wallCol} roughness={0.9} />
      </mesh>

      {/* Door frame header */}
      <mesh position={[0, 2.3, 3.55]}>
        <boxGeometry args={[1.2, 0.2, 0.32]} />
        <meshStandardMaterial color={wallCol} roughness={0.9} />
      </mesh>

      {/* Door panel (sits in front of wall interior face at z=3.40) */}
      <mesh position={[0, 1.1, 3.36]} castShadow>
        <boxGeometry args={[1.0, 2.2, 0.07]} />
        <meshStandardMaterial color="#1a1208" roughness={0.7} />
      </mesh>
      {/* Door panel inset */}
      <mesh position={[0, 1.2, 3.32]}>
        <boxGeometry args={[0.82, 1.7, 0.02]} />
        <meshStandardMaterial color="#130c05" roughness={0.9} />
      </mesh>
      {/* Door handle */}
      <mesh position={[0.36, 1.1, 3.30]}>
        <sphereGeometry args={[0.045, 8, 8]} />
        <meshStandardMaterial color="#8B6914" roughness={0.3} metalness={0.7} />
      </mesh>

      {/* Neon accent strip – north wall */}
      <mesh position={[0, 2.35, -3.38]}>
        <boxGeometry args={[6.5, 0.07, 0.04]} />
        <meshStandardMaterial color={neon} emissive={neon} emissiveIntensity={3} />
      </mesh>

      {/* Neon accent strip – floor edge north */}
      <mesh position={[0, 0.02, -3.4]}>
        <boxGeometry args={[6.5, 0.015, 0.08]} />
        <meshStandardMaterial color={neon} emissive={neon} emissiveIntensity={2} />
      </mesh>

      {/* Corner neon posts */}
      {([-3.4, 3.4] as number[]).flatMap((x) =>
        ([-3.4, 3.4] as number[]).map((z) => (
          <mesh key={`${x}_${z}`} position={[x, 1.25, z]}>
            <boxGeometry args={[0.06, 2.5, 0.06]} />
            <meshStandardMaterial color={neon} emissive={neon} emissiveIntensity={2} />
          </mesh>
        ))
      )}

      {/* Ceiling lamp effect (suspended glow disk) */}
      <mesh position={[0, 2.45, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.4, 16]} />
        <meshBasicMaterial color="#fff8ee" />
      </mesh>

      {/* Lights */}
      <ambientLight intensity={0.35} />
      <pointLight position={[0, 4.5, 0]} color="#fff8ee" intensity={40} distance={18} castShadow />
      <pointLight position={[-2.5, 3, -2.5]} color={neon} intensity={18} distance={9} />
      <pointLight position={[ 2.5, 3, -2.5]} color={neon} intensity={18} distance={9} />
      <pointLight position={[ 0,   2.5,  2]} color={neon} intensity={8}  distance={6} />
    </group>
  )
}

// ─── Decor props ──────────────────────────────────────────────────────────────

function BuildingDecor({ buildingType }: { buildingType: string }) {
  const items = BUILDING_DECOR[buildingType] ?? BUILDING_DECOR.office ?? []
  return (
    <>
      {items.map((item, i) => (
        <Suspense key={i} fallback={null}>
          <GLBProp
            url={item.model}
            position={item.pos}
            rotation={item.rot ?? 0}
            scale={item.scale ?? 1}
          />
        </Suspense>
      ))}
    </>
  )
}

// ─── Examinable object ────────────────────────────────────────────────────────

interface ExaminableProps {
  obj: InteriorObject
  index: number
  position: [number, number, number]
  examined: boolean
  onExamine: () => void
}

function ExaminableObject({ obj, index, position, examined, onExamine }: ExaminableProps) {
  const model = pickPropModel(obj.name, index)

  return (
    <group position={position}>
      <Suspense fallback={null}>
        <GLBProp url={model} position={[0, 0, 0]} scale={1.6} />
      </Suspense>

      {/* Glow ring on floor */}
      {!examined && (
        <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.38, 0.52, 20]} />
          <meshBasicMaterial color="#ffdd00" transparent opacity={0.6} />
        </mesh>
      )}

      {/* Examined marker */}
      {examined && (
        <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.3, 0.4, 20]} />
          <meshBasicMaterial color="#444" transparent opacity={0.5} />
        </mesh>
      )}

      {/* Point light glow */}
      {!examined && (
        <pointLight position={[0, 1.2, 0]} color="#ffdd00" intensity={6} distance={3} />
      )}

      {/* Floating label */}
      {!examined && (
        <Html position={[0, 2.2, 0]} center distanceFactor={10}>
          <div style={{
            color: '#ffdd00', fontSize: 9, letterSpacing: 2,
            background: 'rgba(0,0,0,0.8)', padding: '2px 7px',
            whiteSpace: 'nowrap', fontFamily: '"Courier New", monospace',
            border: '1px solid #ffdd0044', textTransform: 'uppercase',
          }}>
            {obj.name}
          </div>
        </Html>
      )}

      {/* Click hitbox — transparent material keeps raycasting active (visible={false} disables it) */}
      <mesh
        position={[0, 1, 0]}
        onClick={(e) => { e.stopPropagation(); if (!examined) onExamine() }}
      >
        <boxGeometry args={[1.8, 2.2, 1.8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}

// ─── NPC character ────────────────────────────────────────────────────────────

const NPC_MODELS = [
  '/models/characters/character-male-b.glb',
  '/models/characters/character-female-a.glb',
  '/models/characters/character-male-c.glb',
  '/models/characters/character-female-b.glb',
  '/models/characters/character-male-a.glb',
]

function NPCCharacter({ npcId, npcName, neonColor }: { npcId: string; npcName: string; neonColor: string }) {
  // Deterministic model selection by npc id hash
  const modelIdx = npcId.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % NPC_MODELS.length
  const { scene } = useGLTF(NPC_MODELS[modelIdx])
  const cloned = useMemo(() => scene.clone(true), [scene])

  return (
    <group position={[0, 0, -2.8]}>
      <primitive object={cloned} scale={SCALE.character} rotation={[0, Math.PI, 0]} />
      <pointLight position={[0, 2, 0]} color={neonColor} intensity={8} distance={4} />

      <Html position={[0, 2.8, 0]} center distanceFactor={12}>
        <div style={{
          color: '#ff0055', fontSize: 10, letterSpacing: 2,
          background: 'rgba(0,0,0,0.85)', padding: '3px 9px',
          whiteSpace: 'nowrap', fontFamily: '"Courier New", monospace',
          border: '1px solid #ff005544', textTransform: 'uppercase',
        }}>
          {npcName}
        </div>
      </Html>
    </group>
  )
}

// ─── Door proximity hint ──────────────────────────────────────────────────────

const INTERIOR_DOOR_POS = new THREE.Vector3(0, 0, 2.8)

function DoorProximityHint({
  playerPos,
  onExit,
}: {
  playerPos: React.MutableRefObject<THREE.Vector3>
  onExit: () => void
}) {
  const [near, setNear] = useState(false)
  const nearRef = useRef(false)

  useFrame(() => {
    const d = playerPos.current.distanceTo(INTERIOR_DOOR_POS)
    const n = d < 2.0
    if (n !== nearRef.current) {
      nearRef.current = n
      setNear(n)
    }
  })

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() === 'e' && nearRef.current) onExit()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onExit])

  if (!near) return null
  return (
    <Html position={[0, 2.2, 2.8]} center distanceFactor={12}>
      <div style={{
        color: '#aaddff', fontSize: 11, letterSpacing: 2,
        background: 'rgba(0,0,0,0.85)', padding: '4px 12px',
        fontFamily: '"Courier New", monospace',
        border: '1px solid #aaddff44', whiteSpace: 'nowrap',
      }}>
        E — EXIT TO CITY
      </div>
    </Html>
  )
}

// ─── Object proximity checker ────────────────────────────────────────────────

function ObjectProximityChecker({
  objects,
  examinePositions,
  examinedObjects,
  playerPos,
  onNearbyChange,
}: {
  objects: InteriorObject[]
  examinePositions: [number, number, number][]
  examinedObjects: string[]
  playerPos: React.MutableRefObject<THREE.Vector3>
  onNearbyChange: (obj: { obj: InteriorObject; index: number } | null) => void
}) {
  const lastId = useRef<string | null>(null)
  const frameSkip = useRef(0)

  useFrame(() => {
    if (++frameSkip.current % 6 !== 0) return
    const pos = playerPos.current
    let nearest: { obj: InteriorObject; index: number } | null = null
    let nearestDist = Infinity

    objects.forEach((obj, i) => {
      if (examinedObjects.includes(obj.id)) return
      if (i >= examinePositions.length) return
      const ep = examinePositions[i]
      const dx = pos.x - ep[0]
      const dz = pos.z - ep[2]
      const dist = dx * dx + dz * dz
      if (dist < 4 && dist < nearestDist) {
        nearest = { obj, index: i }
        nearestDist = dist
      }
    })

    const id = nearest?.obj.id ?? null
    if (id !== lastId.current) {
      lastId.current = id
      onNearbyChange(nearest)
    }
  })

  return null
}


// ─── Main scene ───────────────────────────────────────────────────────────────

export default function InteriorScene3D() {
  const {
    currentInterior,
    currentCase,
    activeNPC,
    setActiveNPC,
    setCurrentInterior,
    setPhase,
    examineObject,
    examinedObjects,
    collectEvidence,
    accuse,
    addNote,
    collectedEvidence,
    openInventory,
    selectInventoryItem,
    inventoryOpen,
  } = useGameStore()

  const [examinePopup, setExaminePopup] = useState<{
    text: string
    evidenceName?: string
  } | null>(null)
  const popupTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showNotebook, setShowNotebook] = useState(false)
  const [nearbyObj, setNearbyObj] = useState<{ obj: InteriorObject; index: number } | null>(null)
  const nearbyObjRef = useRef<{ obj: InteriorObject; index: number } | null>(null)
  const playerPos = useRef(new THREE.Vector3())
  const controlsRef = useRef<OrbitControlsImpl>(null)

  function handleNearbyObjChange(nearby: { obj: InteriorObject; index: number } | null) {
    nearbyObjRef.current = nearby
    setNearbyObj(nearby)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== 'e') return
      const nearby = nearbyObjRef.current
      if (!nearby) return
      const { examinedObjects: examined } = useGameStore.getState()
      if (!examined.includes(nearby.obj.id)) handleExamine(nearby.obj)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  if (!currentInterior || !currentCase) return null

  const interior = currentInterior
  const buildingData = currentCase.map_layout.buildings.find(
    (b) => b.type === interior.building_type
  )
  const npc = buildingData?.npc_id
    ? currentCase.npcs.find((n) => n.id === buildingData.npc_id) ?? null
    : null

  const neonColor = NEON[interior.building_type] ?? '#ffffff'

  // Colliders for interior objects
  const interiorColliders = useMemo<Collider[]>(() => {
    const out: Collider[] = []

    // Decor items
    const decorItems = BUILDING_DECOR[interior.building_type] ?? BUILDING_DECOR.office ?? []
    for (const item of decorItems) {
      out.push({ x: item.pos[0], z: item.pos[2], hw: 0.4, hd: 0.4 })
    }

    // Examinable objects
    const objs = interior.objects.slice(0, 6)
    objs.forEach((_, i) => {
      if (i < EXAMINE_POSITIONS.length) {
        const ep = EXAMINE_POSITIONS[i]
        out.push({ x: ep[0], z: ep[2], hw: 0.4, hd: 0.4 })
      }
    })

    // NPC
    if (npc) {
      out.push({ x: 0, z: -2.8, hw: 0.35, hd: 0.35 })
    }

    return out
  }, [interior, npc])

  function handleExit() {
    setActiveNPC(null)
    setCurrentInterior(null)
    setPhase('city')
  }

  function handleTalkToNPC() {
    if (npc) setActiveNPC(npc)
    setExaminePopup(null)
  }

  function handleTranscript(text: string) {
    const { activeNPC: npcNow, addMessage } = useGameStore.getState()
    if (npcNow) addMessage(npcNow.id, { role: 'assistant', content: text })
  }

  function handleExamine(obj: InteriorObject) {
    examineObject(obj.id)
    addNote(`[${interior.name}] ${obj.examine_text}`)
    let evidenceName: string | undefined
    if (obj.evidence_id) {
      const item = currentCase!.evidence_items?.find((e) => e.id === obj.evidence_id)
      if (item) {
        collectEvidence(item)
        selectInventoryItem(item)
        evidenceName = item.name
      }
    }
    setExaminePopup({ text: obj.examine_text, evidenceName })
    if (popupTimer.current) clearTimeout(popupTimer.current)
    popupTimer.current = setTimeout(() => setExaminePopup(null), 5000)
  }

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: '#050510',
      position: 'relative', overflow: 'hidden',
      fontFamily: '"Courier New", monospace',
    }}>
      {/* Scanlines */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        opacity: 0.025, zIndex: 10,
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #fff 2px, #fff 3px)',
      }} />

      {/* ── 3D Canvas ── */}
      <Canvas
        camera={{ position: [3, 5, 3], fov: 45, near: 0.1, far: 200 }}
        shadows
        style={{ position: 'absolute', inset: 0 }}
      >
        <OrbitControls
          ref={controlsRef}
          enablePan={false}
          enableDamping
          dampingFactor={0.1}
          minDistance={3}
          maxDistance={15}
          maxPolarAngle={Math.PI / 1.8}
          minPolarAngle={Math.PI / 6}
        />
        <InteriorRoom buildingType={interior.building_type} />
        <FollowCamera target={playerPos.current} controlsRef={controlsRef} wallBounds={{ minX: -3.4, maxX: 3.4, minZ: -3.4, maxZ: 3.4 }} />
        <DoorProximityHint playerPos={playerPos} onExit={handleExit} />
        <ObjectProximityChecker
          objects={interior.objects.slice(0, 6)}
          examinePositions={EXAMINE_POSITIONS}
          examinedObjects={examinedObjects}
          playerPos={playerPos}
          onNearbyChange={handleNearbyObjChange}
        />

        <Suspense fallback={null}>
          <BuildingDecor buildingType={interior.building_type} />

          {interior.objects.slice(0, 6).map((obj, i) => (
            <ExaminableObject
              key={obj.id}
              obj={obj}
              index={i}
              position={EXAMINE_POSITIONS[i]}
              examined={examinedObjects.includes(obj.id)}
              onExamine={() => handleExamine(obj)}
            />
          ))}

          {npc && (
            <NPCCharacter
              npcId={npc.id}
              npcName={npc.name}
              neonColor={neonColor}
            />
          )}
        </Suspense>

        <Suspense fallback={
          <group position={[0, 0, 2.2]}>
            <mesh position={[0, 0.5, 0]}>
              <capsuleGeometry args={[0.15, 0.4, 8, 16]} />
              <meshLambertMaterial color="#4488cc" />
            </mesh>
          </group>
        }>
          <Player
            onPositionChange={(p) => playerPos.current.copy(p)}
            bounds={3.1}
            startPosition={[0, 0, 2.2]}
            playerLight
            colliders={interiorColliders}
          />
        </Suspense>
      </Canvas>

      {/* ── HUD ── */}

      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 20px',
        borderBottom: '1px solid #1a1a2e',
        background: 'rgba(3,3,12,0.92)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={handleExit} style={{
            background: 'transparent', border: '1px solid #2a2a3a',
            color: '#666', padding: '4px 10px', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 10, letterSpacing: 1,
          }}>
            ← CITY
          </button>
          <div>
            <span style={{ color: '#444', fontSize: 10 }}>
              {currentCase.case.title.toUpperCase()} ·{' '}
            </span>
            <span style={{ color: '#d4b483', fontSize: 12, fontWeight: 'bold', letterSpacing: 1 }}>
              {interior.name.toUpperCase()}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {npc && !activeNPC && (
            <>
              <button onClick={handleTalkToNPC} style={{
                background: '#8B0000', border: '1px solid #ff0055',
                color: '#fff', padding: '4px 14px', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 10, letterSpacing: 1,
              }}>
                INTERROGATE {npc.name.split(' ')[0].toUpperCase()}
              </button>
              <button onClick={() => accuse(npc.id)} style={{
                background: 'transparent', border: '1px solid #ff005555',
                color: '#ff0055', padding: '4px 10px', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 10, letterSpacing: 1,
              }}>
                ACCUSE
              </button>
            </>
          )}
          <button onClick={openInventory} style={{
            background: 'transparent',
            border: `1px solid ${collectedEvidence.length > 0 ? '#d4b48366' : '#2a2a3a'}`,
            color: collectedEvidence.length > 0 ? '#d4b483' : '#444',
            padding: '4px 12px', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 10, letterSpacing: 1,
            position: 'relative',
          }}>
            ◆ EVIDENCE
            {collectedEvidence.length > 0 && (
              <span style={{
                position: 'absolute', top: -5, right: -5,
                background: '#d4b483', color: '#050510',
                borderRadius: '50%', width: 14, height: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 8, fontWeight: 'bold',
              }}>
                {collectedEvidence.length}
              </span>
            )}
          </button>
          <button onClick={() => setShowNotebook(true)} style={{
            background: 'transparent', border: '1px solid #8B6914',
            color: '#d4b483', padding: '4px 12px', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 10, letterSpacing: 1,
          }}>
            NOTEBOOK
          </button>
        </div>
      </div>

      {/* Bottom-left: atmosphere + controls hint */}
      <div style={{
        position: 'absolute', bottom: 20, left: 20, zIndex: 20,
        pointerEvents: 'none',
      }}>
        <div style={{
          fontSize: 9, color: '#555', letterSpacing: 3,
          marginBottom: 4, textTransform: 'uppercase',
        }}>
          {interior.atmosphere}
        </div>
        <div style={{ fontSize: 11, color: neonColor, opacity: 0.5, letterSpacing: 1 }}>
          WASD · E OR CLICK TO EXAMINE
        </div>
      </div>

      {/* E-to-examine hint */}
      {nearbyObj && !examinePopup && !activeNPC && (
        <div style={{
          position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.85)', border: '1px solid #ffdd00',
          color: '#fff', padding: '8px 20px',
          fontFamily: '"Courier New", monospace', fontSize: 13, letterSpacing: 2,
          pointerEvents: 'none', textShadow: '0 0 8px #ffdd00', zIndex: 25,
        }}>
          <span style={{ color: '#ffdd00', fontWeight: 'bold' }}>E</span>
          {' '}— {nearbyObj.obj.name.toUpperCase()}
        </div>
      )}

      {/* Bottom-right: object count */}
      <div style={{
        position: 'absolute', bottom: 20, right: 20, zIndex: 20,
        pointerEvents: 'none',
        fontSize: 10, color: '#555', letterSpacing: 2,
      }}>
        {examinedObjects.filter(id => interior.objects.some(o => o.id === id)).length}
        {' / '}
        {interior.objects.length} EXAMINED
      </div>

      {/* Examine popup */}
      {examinePopup && (
        <div
          onClick={() => setExaminePopup(null)}
          style={{
            position: 'absolute', bottom: 70, left: '50%',
            transform: 'translateX(-50%)',
            maxWidth: 520, width: '88%',
            background: 'rgba(3,3,12,0.97)',
            border: `1px solid ${examinePopup.evidenceName ? '#d4b483' : '#2a2a3a'}`,
            padding: '18px 24px', zIndex: 30, cursor: 'pointer',
          }}
        >
          {examinePopup.evidenceName && (
            <div style={{
              fontSize: 9, color: '#8B6914',
              letterSpacing: 2, marginBottom: 6,
            }}>
              ◆ EVIDENCE COLLECTED
            </div>
          )}
          <div style={{
            fontSize: 13, color: '#b8965a',
            lineHeight: 1.8, fontStyle: 'italic',
            marginBottom: examinePopup.evidenceName ? 12 : 0,
          }}>
            {examinePopup.text}
          </div>
          {examinePopup.evidenceName && (
            <div style={{
              fontSize: 13, color: '#d4b483', fontWeight: 'bold',
              borderTop: '1px solid #d4b48322', paddingTop: 8,
            }}>
              {examinePopup.evidenceName}
            </div>
          )}
          <div style={{ fontSize: 9, color: '#333', marginTop: 10, letterSpacing: 1 }}>
            CLICK TO DISMISS
          </div>
        </div>
      )}

      {/* Dialog + voice overlay */}
      {activeNPC && (
        <>
          <DialogBox onClose={() => setActiveNPC(null)} />
          <VoiceUI onTranscript={handleTranscript} />
        </>
      )}

      {showNotebook && <Notebook onClose={() => setShowNotebook(false)} />}
      {inventoryOpen && <Inventory />}
    </div>
  )
}
