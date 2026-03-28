import { Canvas, useFrame } from '@react-three/fiber'
import { Html, useGLTF, OrbitControls } from '@react-three/drei'
import { useState, useRef, useEffect, Suspense } from 'react'
import * as THREE from 'three'
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import FollowCamera from '../components/FollowCamera'
import Player from '../components/Player'
import { useGameStore } from '../store/gameStore'
import { generateWorld } from '../ai/generateWorld'
import { generateCase } from '../ai/generateCase'
import type { Collider } from '../utils/collisions'

// ─── Preload player model ────────────────────────────────────────────────────
useGLTF.preload('/models/characters/character-male-a.glb')

// ─── 3D Room ─────────────────────────────────────────────────────────────────

function OfficeRoom() {
  const FLOOR = '#2a1e10'
  const WALL  = '#1e160c'
  const TRIM  = '#d4b483'

  return (
    <group>
      {/* Floor with wood planks */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[10, 0.1, 10]} />
        <meshStandardMaterial color={FLOOR} roughness={0.9} />
      </mesh>
      {/* Wood plank lines */}
      {[-4,-3,-2,-1,0,1,2,3,4].map((v) => (
        <mesh key={v} position={[v + 0.5, 0.001, 0]} rotation={[-Math.PI/2, 0, 0]}>
          <planeGeometry args={[0.015, 10]} />
          <meshBasicMaterial color="#1a0e06" transparent opacity={0.4} />
        </mesh>
      ))}

      {/* Walls */}
      {/* North */}
      <mesh position={[0, 1.5, -4.55]} castShadow receiveShadow>
        <boxGeometry args={[10, 3, 0.3]} />
        <meshStandardMaterial color={WALL} roughness={0.95} />
      </mesh>
      {/* East */}
      <mesh position={[4.55, 1.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.3, 3, 10]} />
        <meshStandardMaterial color={WALL} roughness={0.95} />
      </mesh>
      {/* West */}
      <mesh position={[-4.55, 1.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.3, 3, 10]} />
        <meshStandardMaterial color={WALL} roughness={0.95} />
      </mesh>
      {/* South – left of door */}
      <mesh position={[-3.2, 1.5, 4.55]} castShadow receiveShadow>
        <boxGeometry args={[3.6, 3, 0.3]} />
        <meshStandardMaterial color={WALL} roughness={0.95} />
      </mesh>
      {/* South – right of door */}
      <mesh position={[3.2, 1.5, 4.55]} castShadow receiveShadow>
        <boxGeometry args={[3.6, 3, 0.3]} />
        <meshStandardMaterial color={WALL} roughness={0.95} />
      </mesh>
      {/* Door header */}
      <mesh position={[0, 2.7, 4.55]}>
        <boxGeometry args={[1.6, 0.3, 0.32]} />
        <meshStandardMaterial color={WALL} roughness={0.95} />
      </mesh>

      {/* Door frame – left side wall fill (floor to header) */}
      <mesh position={[-1.045, 1.275, 4.55]} castShadow receiveShadow>
        <boxGeometry args={[0.71, 2.55, 0.3]} />
        <meshStandardMaterial color={WALL} roughness={0.95} />
      </mesh>
      {/* Door frame – right side wall fill (floor to header) */}
      <mesh position={[1.045, 1.275, 4.55]} castShadow receiveShadow>
        <boxGeometry args={[0.71, 2.55, 0.3]} />
        <meshStandardMaterial color={WALL} roughness={0.95} />
      </mesh>

      {/* Door panel */}
      <mesh position={[0, 1.2, 4.52]} castShadow receiveShadow>
        <boxGeometry args={[1.38, 2.38, 0.08]} />
        <meshStandardMaterial color="#5c3a1e" roughness={0.8} />
      </mesh>
      {/* Door panels inset (upper) */}
      <mesh position={[0, 1.85, 4.48]}>
        <boxGeometry args={[1.1, 0.9, 0.04]} />
        <meshStandardMaterial color="#4a2e14" roughness={0.85} />
      </mesh>
      {/* Door panels inset (lower) */}
      <mesh position={[0, 0.6, 4.48]}>
        <boxGeometry args={[1.1, 1.0, 0.04]} />
        <meshStandardMaterial color="#4a2e14" roughness={0.85} />
      </mesh>
      {/* Door handle */}
      <mesh position={[0.55, 1.2, 4.48]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#b8860b" roughness={0.3} metalness={0.8} />
      </mesh>

      {/* Skirting boards */}
      {[
        { pos: [0, 0.1, -4.4] as [number,number,number], args: [9.7, 0.2, 0.06] as [number,number,number] },
        { pos: [4.4, 0.1, 0] as [number,number,number], args: [0.06, 0.2, 9.7] as [number,number,number] },
        { pos: [-4.4, 0.1, 0] as [number,number,number], args: [0.06, 0.2, 9.7] as [number,number,number] },
      ].map((b, i) => (
        <mesh key={i} position={b.pos}>
          <boxGeometry args={b.args} />
          <meshStandardMaterial color="#3d2a14" roughness={0.7} />
        </mesh>
      ))}

      {/* Cork board on north wall */}
      <mesh position={[-1.5, 1.8, -4.38]}>
        <boxGeometry args={[3.8, 2.0, 0.06]} />
        <meshStandardMaterial color="#8B6320" roughness={0.95} />
      </mesh>
      {/* Cork board frame */}
      {[
        { pos: [-1.5, 2.82, -4.35] as [number,number,number], args: [3.92, 0.12, 0.08] as [number,number,number] },
        { pos: [-1.5, 0.78, -4.35] as [number,number,number], args: [3.92, 0.12, 0.08] as [number,number,number] },
        { pos: [-3.42, 1.8, -4.35] as [number,number,number], args: [0.12, 2.04, 0.08] as [number,number,number] },
        { pos: [ 0.42, 1.8, -4.35] as [number,number,number], args: [0.12, 2.04, 0.08] as [number,number,number] },
      ].map((f, i) => (
        <mesh key={i} position={f.pos}>
          <boxGeometry args={f.args} />
          <meshStandardMaterial color="#3d2008" roughness={0.7} />
        </mesh>
      ))}

      {/* Desk (right side of room) */}
      {/* Desk surface */}
      <mesh position={[3.0, 0.75, -2.0]} castShadow receiveShadow>
        <boxGeometry args={[2.6, 0.08, 1.4]} />
        <meshStandardMaterial color="#3d2a10" roughness={0.7} metalness={0.02} />
      </mesh>
      {/* Desk legs */}
      {[[-1.1, -2.6], [1.1, -2.6], [-1.1, -1.4], [1.1, -1.4]].map(([dx, dz], i) => (
        <mesh key={i} position={[3.0 + dx * 0.0 + (i < 2 ? -1.1 : 1.1) * (i % 2 === 0 ? -1 : 1) * 0 , 0.37, dz]} castShadow>
          <boxGeometry args={[0.06, 0.75, 0.06]} />
          <meshStandardMaterial color="#2a1a08" roughness={0.8} />
        </mesh>
      ))}
      {/* Desk legs simpler */}
      <mesh position={[1.75, 0.37, -2.65]}><boxGeometry args={[0.06,0.75,0.06]}/><meshStandardMaterial color="#2a1a08"/></mesh>
      <mesh position={[4.25, 0.37, -2.65]}><boxGeometry args={[0.06,0.75,0.06]}/><meshStandardMaterial color="#2a1a08"/></mesh>
      <mesh position={[1.75, 0.37, -1.35]}><boxGeometry args={[0.06,0.75,0.06]}/><meshStandardMaterial color="#2a1a08"/></mesh>
      <mesh position={[4.25, 0.37, -1.35]}><boxGeometry args={[0.06,0.75,0.06]}/><meshStandardMaterial color="#2a1a08"/></mesh>

      {/* Monitor base */}
      <mesh position={[3.0, 0.79, -2.5]}>
        <boxGeometry args={[0.5, 0.04, 0.3]} />
        <meshStandardMaterial color="#111" roughness={0.3} metalness={0.6} />
      </mesh>
      {/* Monitor stand */}
      <mesh position={[3.0, 0.98, -2.5]}>
        <boxGeometry args={[0.06, 0.36, 0.06]} />
        <meshStandardMaterial color="#111" roughness={0.3} metalness={0.6} />
      </mesh>
      {/* Monitor screen */}
      <mesh position={[3.0, 1.38, -2.48]}>
        <boxGeometry args={[1.1, 0.7, 0.06]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.2} metalness={0.8} />
      </mesh>
      {/* Screen glow */}
      <mesh position={[3.0, 1.38, -2.44]}>
        <boxGeometry args={[1.0, 0.62, 0.01]} />
        <meshStandardMaterial color="#0a1a0a" emissive="#0a2a0a" emissiveIntensity={2} />
      </mesh>

      {/* Filing cabinet */}
      <mesh position={[-4.2, 0.65, -3.0]} castShadow>
        <boxGeometry args={[0.5, 1.3, 0.8]} />
        <meshStandardMaterial color="#2a2010" roughness={0.8} metalness={0.1} />
      </mesh>
      {/* Cabinet drawer handles */}
      {[0.25, -0.15, -0.55].map((dy, i) => (
        <mesh key={i} position={[-3.94, 0.65 + dy, -3.0]}>
          <boxGeometry args={[0.12, 0.04, 0.04]} />
          <meshStandardMaterial color="#8B6914" roughness={0.4} metalness={0.6} />
        </mesh>
      ))}

      {/* Bookshelf */}
      <mesh position={[-4.2, 1.0, 1.0]} castShadow>
        <boxGeometry args={[0.5, 2.0, 2.0]} />
        <meshStandardMaterial color="#2a1a08" roughness={0.8} />
      </mesh>
      {/* Books */}
      {[0.8, 0.4, 0, -0.4, -0.8].flatMap((dz, i) =>
        [0.5, 0.0, -0.5].map((dy, j) => (
          <mesh key={`${i}_${j}`} position={[-3.96, 1.0 + dy, 1.0 + dz]}>
            <boxGeometry args={[0.04, 0.35 + (i % 2) * 0.05, 0.14 - (j % 2) * 0.02]} />
            <meshStandardMaterial color={['#8B0000','#1a3a1a','#3a2a00','#1a1a3a','#3a1a1a'][i % 5]} roughness={0.9} />
          </mesh>
        ))
      )}

      {/* Warm trim strip near ceiling */}
      <mesh position={[0, 2.95, -4.4]}>
        <boxGeometry args={[9.6, 0.08, 0.04]} />
        <meshStandardMaterial color={TRIM} emissive={TRIM} emissiveIntensity={0.4} />
      </mesh>

      {/* Ceiling */}
      <mesh position={[0, 3.02, 0]} rotation={[Math.PI/2, 0, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#110c06" roughness={1} />
      </mesh>

      {/* Pendant lamp */}
      <mesh position={[0, 2.9, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.4, 8]} />
        <meshStandardMaterial color="#2a1a08" />
      </mesh>
      <mesh position={[0, 2.6, 0]}>
        <cylinderGeometry args={[0.35, 0.25, 0.22, 16, 1, true]} />
        <meshStandardMaterial color="#d4b483" roughness={0.3} side={THREE.DoubleSide} />
      </mesh>

      {/* Lights */}
      <ambientLight intensity={0.25} color="#ffe4b0" />
      <pointLight position={[0, 2.5, 0]} color="#ffe4b0" intensity={50} distance={14} castShadow />
      <pointLight position={[3.0, 1.5, -2.5]} color="#88cc88" intensity={8} distance={4} />
      <pointLight position={[-1.5, 1.5, -3.5]} color="#d4b483" intensity={6} distance={5} />
      <pointLight position={[0, 0.5, 2.0]} color="#ffe4b0" intensity={6} distance={6} />
    </group>
  )
}

// ─── Office colliders ─────────────────────────────────────────────────────────

const OFFICE_COLLIDERS: Collider[] = [
  { x: 3.0,  z: -2.0, hw: 1.5, hd: 0.9 },   // desk
  { x: -4.2, z: -3.0, hw: 0.4, hd: 0.5 },   // filing cabinet
  { x: -4.2, z:  1.0, hw: 0.4, hd: 1.2 },   // bookshelf
]

// ─── Player (uses shared Player component) ───────────────────────────────────

// ─── Proximity triggers ───────────────────────────────────────────────────────

const BOARD_POS  = new THREE.Vector3(-1.5, 0, -3.8)
const DESK_POS   = new THREE.Vector3(3.0,  0, -1.5)
const DOOR_POS   = new THREE.Vector3(0,    0,  3.8)

function ProximityHints({ playerPos, onBoard, onDesk, onDoor, boardOpen, computerOpen }: {
  playerPos: React.MutableRefObject<THREE.Vector3>
  onBoard: () => void
  onDesk: () => void
  onDoor: () => void
  boardOpen: boolean
  computerOpen: boolean
}) {
  const hasCase = !!useGameStore((s) => s.currentCase)
  const [nearBoard, setNearBoard] = useState(false)
  const [nearDesk, setNearDesk]   = useState(false)
  const [nearDoor, setNearDoor]   = useState(false)

  useFrame(() => {
    const nb = playerPos.current.distanceTo(BOARD_POS) < 2.5
    const nd = playerPos.current.distanceTo(DESK_POS)  < 2.5
    const ng = playerPos.current.distanceTo(DOOR_POS)  < 2.0
    setNearBoard(nb)
    setNearDesk(nd)
    setNearDoor(ng)
  })

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== 'e') return
      // Read store at press-time to avoid stale closure
      if (nearDoor && !!useGameStore.getState().currentCase) onDoor()
      else if (nearBoard) onBoard()
      else if (nearDesk) onDesk()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [nearBoard, nearDesk, nearDoor, onBoard, onDesk, onDoor])

  return (
    <>
      {nearBoard && !boardOpen && (
        <Html position={[-1.5, 2.2, -3.8]} center distanceFactor={12}>
          <div style={{
            color: '#d4b483', fontSize: 13, letterSpacing: 2,
            background: 'rgba(0,0,0,0.85)', padding: '4px 12px',
            fontFamily: '"Courier New", monospace',
            border: '1px solid #d4b48344', whiteSpace: 'nowrap',
          }}>
            E — CASE BOARD
          </div>
        </Html>
      )}
      {nearDesk && !computerOpen && (
        <Html position={[3.0, 2.2, -2.0]} center distanceFactor={12}>
          <div style={{
            color: '#88cc88', fontSize: 13, letterSpacing: 2,
            background: 'rgba(0,0,0,0.85)', padding: '4px 12px',
            fontFamily: '"Courier New", monospace',
            border: '1px solid #88cc8844', whiteSpace: 'nowrap',
          }}>
            E — EVIDENCE COMPUTER
          </div>
        </Html>
      )}
      {nearDoor && hasCase && (
        <Html position={[0, 2.2, 3.8]} center distanceFactor={12}>
          <div style={{
            color: '#aaddff', fontSize: 11, letterSpacing: 2,
            background: 'rgba(0,0,0,0.85)', padding: '4px 12px',
            fontFamily: '"Courier New", monospace',
            border: '1px solid #aaddff44', whiteSpace: 'nowrap',
          }}>
            E — EXIT TO CITY
          </div>
        </Html>
      )}
      {nearDoor && !hasCase && (
        <Html position={[0, 2.2, 3.8]} center distanceFactor={12}>
          <div style={{
            color: '#664422', fontSize: 11, letterSpacing: 2,
            background: 'rgba(0,0,0,0.85)', padding: '4px 12px',
            fontFamily: '"Courier New", monospace',
            border: '1px solid #66442244', whiteSpace: 'nowrap',
          }}>
            SELECT A CASE FIRST
          </div>
        </Html>
      )}
    </>
  )
}

// ─── Cork Board Overlay ───────────────────────────────────────────────────────

const PIN_COLORS = ['#e74c3c', '#e67e22', '#f1c40f', '#3498db', '#9b59b6', '#2ecc71']

const TYPE_COLORS: Record<string, string> = {
  murder: '#ff0055', theft: '#ffaa00', kidnapping: '#aa44ff',
  fraud: '#00aaff', disappearance: '#888888', extortion: '#ff6600',
}

function CorkBoardOverlay({ onClose }: { onClose: () => void }) {
  const { world, setWorld, currentCase, setCurrentCase, setPhase } = useGameStore()
  const [loadingActId, setLoadingActId] = useState<string | null>(null)
  const [generatingWorld, setGeneratingWorld] = useState(!world)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Generate world on first open if not yet generated
  useEffect(() => {
    if (world) return
    setGeneratingWorld(true)
    generateWorld()
      .then((w) => { setWorld(w); setGeneratingWorld(false) })
      .catch((e) => { setError(e instanceof Error ? e.message : String(e)); setGeneratingWorld(false) })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const acts = world?.cases ?? []
  const activeActId = world?.cases.find((c) => c.title === currentCase?.case.title)?.id ?? null

  async function handlePickAct(actId: string) {
    if (loadingActId || activeActId) return
    const summary = world!.cases.find((c) => c.id === actId)
    if (!summary) return
    setLoadingActId(actId)
    setError(null)
    try {
      const fullCase = await generateCase(summary, world!.city.name)
      setCurrentCase(fullCase)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
    setLoadingActId(null)
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: '"Courier New", monospace',
      }}
      onClick={onClose}
    >
      {/* Cork board panel */}
      <div
        style={{
          width: 800, maxWidth: '92vw', maxHeight: '88vh',
          background: `
            radial-gradient(ellipse at 25% 30%, rgba(200,155,70,0.25) 0%, transparent 55%),
            radial-gradient(ellipse at 75% 70%, rgba(170,120,50,0.15) 0%, transparent 55%),
            linear-gradient(135deg, #9b6f30 0%, #8a5e24 30%, #9b6f30 65%, #7a4e1a 100%)
          `,
          border: '10px solid #3d1f08',
          boxShadow: '0 0 40px rgba(0,0,0,0.8), inset 0 0 40px rgba(0,0,0,0.3)',
          padding: 28,
          overflow: 'auto',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cork texture dots */}
        {Array.from({ length: 80 }).map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: (i % 3) + 2, height: (i % 3) + 2,
            borderRadius: '50%',
            background: i % 2 === 0 ? 'rgba(100,60,15,0.25)' : 'rgba(200,150,60,0.15)',
            left: `${(i * 23 + 7) % 100}%`,
            top: `${(i * 17 + 11) % 100}%`,
            pointerEvents: 'none',
          }} />
        ))}

        {/* Header card */}
        <div style={{ textAlign: 'center', marginBottom: 24, position: 'relative' }}>
          <div style={{
            display: 'inline-block',
            background: '#1a0a04', border: '2px solid #8B6914',
            padding: '8px 36px',
            boxShadow: '2px 3px 10px rgba(0,0,0,0.5)',
          }}>
            <div style={{ fontSize: 9, color: '#555', letterSpacing: 4, marginBottom: 2 }}>PRECINCT FILES</div>
            <div style={{ fontSize: 18, color: '#d4b483', letterSpacing: 6 }}>OPEN ACTS</div>
          </div>
          {world && (
            <div style={{ fontSize: 10, color: '#8B6914', marginTop: 8, letterSpacing: 2 }}>
              {world.city.name.toUpperCase()}
            </div>
          )}
        </div>

        {/* Loading world spinner */}
        {generatingWorld && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#d4b483' }}>
            <div style={{ fontSize: 13, letterSpacing: 4, marginBottom: 12 }}>RECEIVING CASE FILES...</div>
            <div style={{ fontSize: 10, color: '#8B6914', letterSpacing: 2 }}>Building city · Placing suspects · Hiding evidence</div>
          </div>
        )}

        {/* Act cards */}
        {!generatingWorld && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, justifyContent: 'center' }}>
            {acts.map((act, i) => {
              const isActive    = act.id === activeActId
              const isLoading   = act.id === loadingActId
              const isLocked    = !!activeActId && !isActive   // another act is active
              const isAnyLoading = !!loadingActId
              const pinColor    = PIN_COLORS[i % PIN_COLORS.length]
              const typeColor   = TYPE_COLORS[act.type] ?? '#d4b483'
              const rot         = (i % 5 - 2) * 1.8

              const clickable = !isLocked && !isAnyLoading && !isActive

              return (
                <div
                  key={act.id}
                  onClick={() => clickable && handlePickAct(act.id)}
                  style={{
                    position: 'relative',
                    background: isActive
                      ? 'linear-gradient(135deg, #1a0a04, #0e0502)'
                      : isLocked
                        ? 'linear-gradient(135deg, #d0c8b0, #c8c0a8)'
                        : 'linear-gradient(135deg, #faf3e0, #f0e6c8)',
                    border: isActive
                      ? `2px solid ${typeColor}`
                      : isLocked
                        ? '1px solid rgba(0,0,0,0.08)'
                        : '1px solid rgba(0,0,0,0.1)',
                    padding: '22px 14px 16px',
                    width: 165,
                    boxShadow: isActive
                      ? `0 0 20px ${typeColor}44, 3px 4px 14px rgba(0,0,0,0.5)`
                      : '2px 3px 10px rgba(0,0,0,0.35)',
                    transform: isActive ? 'rotate(0deg) scale(1.04)' : `rotate(${rot}deg)`,
                    cursor: clickable ? 'pointer' : isLocked ? 'not-allowed' : 'default',
                    opacity: isLocked ? 0.55 : 1,
                    transition: 'transform 0.15s, box-shadow 0.15s, opacity 0.2s',
                    filter: isLocked ? 'grayscale(40%)' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (clickable) {
                      ;(e.currentTarget as HTMLElement).style.transform = 'rotate(0deg) scale(1.05)'
                      ;(e.currentTarget as HTMLElement).style.boxShadow = '4px 6px 20px rgba(0,0,0,0.55)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (clickable) {
                      ;(e.currentTarget as HTMLElement).style.transform = `rotate(${rot}deg)`
                      ;(e.currentTarget as HTMLElement).style.boxShadow = '2px 3px 10px rgba(0,0,0,0.35)'
                    }
                  }}
                >
                  {/* Push pin */}
                  <div style={{
                    position: 'absolute', top: 7, left: '50%', transform: 'translateX(-50%)',
                    width: 13, height: 13, borderRadius: '50%',
                    background: isLocked
                      ? 'radial-gradient(circle at 40% 35%, #888, #555)'
                      : `radial-gradient(circle at 40% 35%, ${pinColor}ee, ${pinColor}88)`,
                    border: `1px solid ${isLocked ? '#555' : pinColor}`,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
                  }} />

                  <div style={{
                    fontSize: 8, color: isActive ? typeColor : isLocked ? '#888' : '#555',
                    letterSpacing: 2, marginBottom: 6, textTransform: 'uppercase',
                  }}>
                    {act.type}
                  </div>
                  <div style={{
                    fontSize: 12, color: isActive ? typeColor : isLocked ? '#777' : '#1a0a00',
                    fontWeight: 'bold', lineHeight: 1.35, marginBottom: 8,
                  }}>
                    {act.title}
                  </div>
                  <div style={{
                    fontSize: 9, color: isActive ? '#888' : isLocked ? '#999' : '#4a3020',
                    lineHeight: 1.5, marginBottom: 8,
                    fontStyle: 'italic',
                  }}>
                    "{act.hook}"
                  </div>
                  <div style={{
                    fontSize: 8, color: isActive ? '#555' : isLocked ? '#999' : '#7a5a30',
                    borderTop: `1px solid ${isActive ? '#333' : 'rgba(0,0,0,0.12)'}`,
                    paddingTop: 6, letterSpacing: 1, marginBottom: 2,
                  }}>
                    {act.victim_name}
                  </div>
                  <div style={{ fontSize: 8, color: isActive ? '#444' : isLocked ? '#999' : '#7a5a30' }}>
                    {act.location}
                  </div>

                  {/* Locked stamp */}
                  {isLocked && (
                    <div style={{
                      position: 'absolute', inset: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      pointerEvents: 'none',
                    }}>
                      <div style={{
                        border: '2px solid rgba(100,80,50,0.4)',
                        color: 'rgba(100,80,50,0.5)',
                        fontSize: 11, letterSpacing: 3, padding: '4px 10px',
                        transform: 'rotate(-12deg)', fontWeight: 'bold',
                      }}>
                        LOCKED
                      </div>
                    </div>
                  )}

                  {/* Active ribbon */}
                  {isActive && (
                    <div style={{
                      position: 'absolute', bottom: -1, left: 0, right: 0,
                      background: typeColor, color: '#0a0502',
                      fontSize: 7, padding: '3px 0', letterSpacing: 2,
                      fontWeight: 'bold', textAlign: 'center',
                    }}>
                      ACTIVE INVESTIGATION
                    </div>
                  )}

                  {/* Loading overlay */}
                  {isLoading && (
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'rgba(10,5,2,0.85)',
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}>
                      <div style={{ fontSize: 10, color: '#d4b483', letterSpacing: 3 }}>
                        OPENING FILE...
                      </div>
                      <div style={{ fontSize: 9, color: '#8B6914' }}>
                        Building case
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {error && (
          <div style={{
            marginTop: 16, padding: '8px 16px',
            background: 'rgba(180,0,0,0.15)', border: '1px solid #aa222244',
            color: '#cc4444', fontSize: 11, textAlign: 'center',
          }}>
            {error}
          </div>
        )}

        <div style={{
          textAlign: 'center', marginTop: 18,
          fontSize: 9, color: '#5a4020', letterSpacing: 2,
        }}>
          {activeActId
            ? 'CASE IN PROGRESS — COMPLETE IT BEFORE STARTING ANOTHER'
            : 'CLICK AN ACT TO BEGIN INVESTIGATION'}
          {' · '}
          CLICK OUTSIDE TO CLOSE
        </div>
      </div>
    </div>
  )
}

// ─── Computer (Evidence pinning) Overlay ─────────────────────────────────────

function ComputerOverlay({ onClose, onSendToLaw }: {
  onClose: () => void
  onSendToLaw: (npcId: string, evidenceIds: string[]) => void
}) {
  const {
    currentCase,
    collectedEvidence,
    suspectEvidence,
    assignEvidenceToSuspect,
    removeEvidenceFromSuspect,
  } = useGameStore()

  const [selectedSuspect, setSelectedSuspect] = useState<string | null>(null)

  if (!currentCase) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }} onClick={onClose}>
        <div style={{
          background: '#fff', borderRadius: 8,
          padding: '30px 40px', color: '#555', fontSize: 14,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}>
          No active case — open the Case Board first.
        </div>
      </div>
    )
  }

  const npcs = currentCase.npcs
  const pinnedForSelected = selectedSuspect ? (suspectEvidence[selectedSuspect] ?? []) : []

  function toggleEvidence(evidenceId: string) {
    if (!selectedSuspect) return
    if (pinnedForSelected.includes(evidenceId)) {
      removeEvidenceFromSuspect(selectedSuspect, evidenceId)
    } else {
      assignEvidenceToSuspect(selectedSuspect, evidenceId)
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
      onClick={onClose}
    >
      {/* App window */}
      <div
        style={{
          width: 760, maxWidth: '92vw', maxHeight: '88vh',
          background: '#f0f0f0',
          borderRadius: 10,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title bar */}
        <div style={{
          background: 'linear-gradient(180deg, #e8e8e8, #d8d8d8)',
          borderBottom: '1px solid #bbb',
          padding: '8px 14px',
          display: 'flex', alignItems: 'center', gap: 8,
          userSelect: 'none',
        }}>
          {/* Traffic lights */}
          <button onClick={onClose} style={{
            width: 12, height: 12, borderRadius: '50%',
            background: '#ff5f57', border: '1px solid #e0443e',
            cursor: 'pointer', flexShrink: 0,
          }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#febc2e', border: '1px solid #d6a12a' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28c840', border: '1px solid #1aab29' }} />
          <div style={{ flex: 1, textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#444', marginLeft: -48 }}>
            Suspects — Evidence Log
          </div>
        </div>

        {/* Toolbar */}
        <div style={{
          background: '#fafafa', borderBottom: '1px solid #ddd',
          padding: '6px 16px', display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ fontSize: 12, color: '#666' }}>📁 Case: <strong style={{ color: '#222' }}>{currentCase.case.title}</strong></div>
        </div>

        {/* Main content */}
        <div style={{
          flex: 1, display: 'flex', overflow: 'hidden',
        }}>
          {/* Left sidebar: suspects */}
          <div style={{
            width: 210, flexShrink: 0,
            background: '#f5f5f5', borderRight: '1px solid #ddd',
            display: 'flex', flexDirection: 'column',
            overflow: 'auto',
          }}>
            <div style={{ padding: '10px 14px 6px', fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>
              Suspects
            </div>
            {npcs.map((npc) => {
              const count = (suspectEvidence[npc.id] ?? []).length
              const active = selectedSuspect === npc.id
              return (
                <button
                  key={npc.id}
                  onClick={() => setSelectedSuspect(npc.id === selectedSuspect ? null : npc.id)}
                  style={{
                    background: active ? '#0057d8' : 'transparent',
                    border: 'none',
                    borderBottom: '1px solid #e8e8e8',
                    padding: '10px 14px', cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.1s',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: active ? '#fff' : '#222' }}>
                    {npc.name}
                  </div>
                  <div style={{ fontSize: 11, color: active ? 'rgba(255,255,255,0.75)' : '#888', marginTop: 2 }}>
                    {npc.occupation}
                  </div>
                  {count > 0 && (
                    <div style={{
                      marginTop: 5, display: 'inline-block',
                      background: active ? 'rgba(255,255,255,0.25)' : '#0057d8',
                      color: '#fff',
                      fontSize: 10, padding: '1px 7px', borderRadius: 10, fontWeight: 600,
                    }}>
                      {count} linked
                    </div>
                  )}
                </button>
              )
            })}

            <div style={{ flex: 1 }} />

            {/* Send to law */}
            {selectedSuspect && (
              <div style={{ padding: 14, borderTop: '1px solid #ddd' }}>
                {pinnedForSelected.length === 0 && (
                  <div style={{ fontSize: 11, color: '#b06000', marginBottom: 8, lineHeight: 1.4 }}>
                    Link at least one piece of evidence first.
                  </div>
                )}
                <button
                  onClick={() => onSendToLaw(selectedSuspect, pinnedForSelected)}
                  disabled={pinnedForSelected.length === 0}
                  style={{
                    width: '100%',
                    background: pinnedForSelected.length > 0 ? '#c0392b' : '#ccc',
                    border: 'none',
                    color: '#fff',
                    padding: '9px 0', cursor: pinnedForSelected.length > 0 ? 'pointer' : 'not-allowed',
                    borderRadius: 6, fontWeight: 700, fontSize: 13,
                    boxShadow: pinnedForSelected.length > 0 ? '0 2px 6px rgba(192,57,43,0.4)' : 'none',
                    transition: 'all 0.1s',
                  }}
                >
                  ⚖ File Charges
                </button>
              </div>
            )}
          </div>

          {/* Right: evidence list */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff' }}>
            <div style={{ padding: '10px 18px 8px', borderBottom: '1px solid #eee', fontSize: 12, color: '#555' }}>
              {selectedSuspect
                ? <>Link evidence to <strong>{npcs.find(n => n.id === selectedSuspect)?.name}</strong></>
                : 'Select a suspect to link evidence'}
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '10px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {collectedEvidence.length === 0 && (
                <div style={{
                  fontSize: 13, color: '#aaa', fontStyle: 'italic',
                  padding: '30px 0', textAlign: 'center',
                }}>
                  No evidence collected yet.<br />
                  <span style={{ fontSize: 12 }}>Investigate locations in the city first.</span>
                </div>
              )}

              {collectedEvidence.map((ev) => {
                const pinned = pinnedForSelected.includes(ev.id)
                const canToggle = !!selectedSuspect

                return (
                  <div
                    key={ev.id}
                    onClick={() => canToggle && toggleEvidence(ev.id)}
                    style={{
                      border: `1.5px solid ${pinned ? '#0057d8' : '#e0e0e0'}`,
                      borderRadius: 7,
                      padding: '10px 14px',
                      background: pinned ? '#eef4ff' : '#fafafa',
                      cursor: canToggle ? 'pointer' : 'default',
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                      opacity: !canToggle ? 0.5 : 1,
                      transition: 'all 0.12s',
                      boxShadow: pinned ? '0 0 0 3px rgba(0,87,216,0.08)' : 'none',
                    }}
                  >
                    {/* Checkbox */}
                    <div style={{
                      width: 16, height: 16, flexShrink: 0, marginTop: 2,
                      borderRadius: 4,
                      border: `2px solid ${pinned ? '#0057d8' : '#bbb'}`,
                      background: pinned ? '#0057d8' : '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, color: '#fff', fontWeight: 700,
                    }}>
                      {pinned ? '✓' : ''}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#222', marginBottom: 2 }}>
                        {ev.name}
                      </div>
                      <div style={{ fontSize: 11, color: '#888' }}>
                        Found at: {ev.found_at}
                      </div>
                      <div style={{ fontSize: 12, color: '#555', marginTop: 4, lineHeight: 1.5 }}>
                        {ev.description}
                      </div>
                    </div>

                    {pinned && (
                      <div style={{
                        fontSize: 11, color: '#0057d8', fontWeight: 600,
                        background: '#ddeaff', padding: '2px 8px', borderRadius: 10,
                        flexShrink: 0,
                      }}>
                        Linked
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Result Modal ─────────────────────────────────────────────────────────────

interface ResultState {
  success: boolean
  partial: boolean
  message: string
  npcId: string
}

function ResultModal({ result, onClose, onConfirm }: {
  result: ResultState
  onClose: () => void
  onConfirm: () => void
}) {
  const color = result.success ? '#55aa55' : result.partial ? '#aa8822' : '#aa2222'
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.9)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '"Courier New", monospace',
    }}>
      <div style={{
        background: '#080c08', border: `2px solid ${color}`,
        padding: '40px 52px', maxWidth: 520, textAlign: 'center',
        boxShadow: `0 0 60px ${color}44`,
      }}>
        <div style={{ fontSize: 9, color, letterSpacing: 4, marginBottom: 12 }}>
          — CASE VERDICT —
        </div>
        <div style={{ fontSize: 26, color, marginBottom: 20, letterSpacing: 3 }}>
          {result.success ? 'CASE CLOSED' : result.partial ? 'CASE DISMISSED' : 'WRONGFUL ARREST'}
        </div>
        <div style={{
          fontSize: 13, color: `${color}cc`, lineHeight: 1.9,
          marginBottom: 28, fontStyle: 'italic',
        }}>
          {result.message}
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          {result.success && (
            <button onClick={onConfirm} style={{
              background: '#1a3a1a', border: `1px solid ${color}`,
              color, padding: '10px 28px', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 11, letterSpacing: 2,
            }}>
              CLOSE CASE ▶
            </button>
          )}
          <button onClick={onClose} style={{
            background: 'transparent', border: '1px solid #2a2a3a',
            color: '#555', padding: '10px 20px', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 11, letterSpacing: 2,
          }}>
            KEEP INVESTIGATING
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main scene ───────────────────────────────────────────────────────────────

export default function DetectiveOfficeScene() {
  const { world, setWorld, currentCase, suspectEvidence, accuse, setPhase } = useGameStore()
  const playerPos = useRef(new THREE.Vector3(0, 0, 2.5))
  const controlsRef = useRef<OrbitControlsImpl>(null)

  const [showBoard, setShowBoard]       = useState(false)
  const [showComputer, setShowComputer] = useState(false)
  const [result, setResult]             = useState<ResultState | null>(null)
  const [loadingWorld, setLoadingWorld] = useState(false)
  const [worldError, setWorldError] = useState<string | null>(null)

  function loadWorld() {
    setLoadingWorld(true)
    setWorldError(null)
    generateWorld()
      .then((w) => { setWorld(w); setLoadingWorld(false) })
      .catch((e) => {
        setWorldError(e instanceof Error ? e.message : String(e))
        setLoadingWorld(false)
      })
  }

  // World is generated by CorkBoardOverlay when it opens

  function handleSendToLaw(npcId: string, evidenceIds: string[]) {
    if (!currentCase) return
    const npc = currentCase.npcs.find((n) => n.id === npcId)!
    const solution = currentCase.case.solution
    const isCorrect = npcId === solution.murderer_id
    const hasEvidence = evidenceIds.length > 0

    if (isCorrect && hasEvidence) {
      setResult({
        success: true, partial: false, npcId,
        message: `${npc.name} has been arrested and charged. The evidence you presented was decisive. The city is safer tonight.`,
      })
    } else if (isCorrect && !hasEvidence) {
      setResult({
        success: false, partial: true, npcId,
        message: `You identified ${npc.name} correctly, but without any proof the prosecutor dismissed the case. Pin evidence to your suspect and try again.`,
      })
    } else {
      setResult({
        success: false, partial: false, npcId,
        message: `${npc.name} was innocent. The case was thrown out and your reputation has suffered. The real culprit is still out there.`,
      })
    }
    setShowComputer(false)
  }

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: '#080503',
      position: 'relative', overflow: 'hidden',
      fontFamily: '"Courier New", monospace',
    }}>
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [6, 8, 6], fov: 45, near: 0.1, far: 200 }}
        shadows
        style={{ position: 'absolute', inset: 0 }}
      >
        <OrbitControls
          ref={controlsRef}
          enablePan={false}
          enableDamping
          dampingFactor={0.1}
          minDistance={5}
          maxDistance={25}
          maxPolarAngle={Math.PI / 1.8}
          minPolarAngle={Math.PI / 6}
        />
        <OfficeRoom />
        <FollowCamera
          target={playerPos.current}
          controlsRef={controlsRef}
          wallBounds={{ minX: -4.4, maxX: 4.4, minZ: -4.4, maxZ: 4.4 }}
        />
        <ProximityHints
          playerPos={playerPos}
          onBoard={() => setShowBoard(true)}
          onDesk={() => setShowComputer(true)}
          onDoor={() => setPhase('city')}
          boardOpen={showBoard}
          computerOpen={showComputer}
        />
        <Suspense fallback={null}>
          <Player
            onPositionChange={(p) => playerPos.current.copy(p)}
            bounds={4.0}
            startPosition={[0, 0, 2.5]}
            playerLight
            colliders={OFFICE_COLLIDERS}
            characterScale={1.5}
          />
        </Suspense>
      </Canvas>

      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
        background: 'rgba(5,3,2,0.95)',
        borderBottom: '1px solid #2a1a08',
        padding: '10px 20px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 10, color: '#555', letterSpacing: 3 }}>
            DETECTIVE'S OFFICE — 3RD FLOOR
          </span>
          {currentCase && (
            <span style={{ fontSize: 11, color: '#d4b483', letterSpacing: 2 }}>
              · {currentCase.case.title.toUpperCase()}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {!currentCase && (
            <span style={{ fontSize: 9, color: '#3a2a10', letterSpacing: 2 }}>
              APPROACH THE BOARD TO SELECT A CASE
            </span>
          )}
        </div>
      </div>

      {/* Controls hint */}
      <div style={{
        position: 'absolute', bottom: 20, left: 20, zIndex: 20,
        pointerEvents: 'none',
        fontSize: 10, color: '#3a2a10', letterSpacing: 2,
      }}>
        WASD MOVE · E INTERACT
      </div>

      {/* World loading / error overlay */}
      {(loadingWorld || worldError) && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 40,
          background: 'rgba(5,3,2,0.92)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          fontFamily: '"Courier New", monospace',
        }}>
          {loadingWorld && (
            <>
              <div style={{ fontSize: 14, color: '#d4b483', letterSpacing: 5, marginBottom: 12 }}>
                RECEIVING CASE FILES...
              </div>
              <div style={{ fontSize: 10, color: '#8B6914', letterSpacing: 3 }}>
                Building city · Placing suspects · Hiding evidence
              </div>
            </>
          )}
          {worldError && !loadingWorld && (
            <>
              <div style={{ fontSize: 14, color: '#cc4444', letterSpacing: 4, marginBottom: 12 }}>
                CONNECTION FAILED
              </div>
              <div style={{ fontSize: 10, color: '#884444', letterSpacing: 2, marginBottom: 20, maxWidth: 400, textAlign: 'center' }}>
                {worldError}
              </div>
              <button
                onClick={loadWorld}
                style={{
                  background: '#3a0a00', border: '1px solid #cc4444',
                  color: '#cc4444', padding: '8px 24px', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 11, letterSpacing: 3,
                }}
              >
                RETRY
              </button>
            </>
          )}
        </div>
      )}

      {/* Overlays */}
      {showBoard    && <CorkBoardOverlay onClose={() => setShowBoard(false)} />}
      {showComputer && <ComputerOverlay  onClose={() => setShowComputer(false)} onSendToLaw={handleSendToLaw} />}
      {result && (
        <ResultModal
          result={result}
          onClose={() => setResult(null)}
          onConfirm={() => { accuse(result.npcId); setResult(null) }}
        />
      )}
    </div>
  )
}
