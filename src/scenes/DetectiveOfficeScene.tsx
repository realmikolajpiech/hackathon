import { Canvas, useFrame } from '@react-three/fiber'
import { Html, useGLTF } from '@react-three/drei'
import { useState, useRef, useMemo, useEffect, Suspense } from 'react'
import * as THREE from 'three'
import FollowCamera from '../components/FollowCamera'
import { useGameStore } from '../store/gameStore'
import { generateWorld } from '../ai/generateWorld'
import { generateCase } from '../ai/generateCase'

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

// ─── Player ───────────────────────────────────────────────────────────────────

const PLAYER_SPEED = 5
const ROOM_BOUND = 4.0

function OfficePlayer({ onPositionChange }: { onPositionChange: (pos: THREE.Vector3) => void }) {
  const { scene } = useGLTF('/models/characters/character-male-a.glb')
  const cloned = useMemo(() => scene.clone(true), [scene])
  const groupRef = useRef<THREE.Group>(null)
  const keys = useRef({ w: false, a: false, s: false, d: false })
  const facingAngle = useRef(Math.PI)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const k = e.key.toLowerCase()
      if (k in keys.current) keys.current[k as keyof typeof keys.current] = true
    }
    function onKeyUp(e: KeyboardEvent) {
      const k = e.key.toLowerCase()
      if (k in keys.current) keys.current[k as keyof typeof keys.current] = false
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  useFrame((_, delta) => {
    if (!groupRef.current) return
    const { w, a, s, d } = keys.current
    const dir = new THREE.Vector3()
    if (w) { dir.x -= 1; dir.z -= 1 }
    if (s) { dir.x += 1; dir.z += 1 }
    if (a) { dir.x -= 1; dir.z += 1 }
    if (d) { dir.x += 1; dir.z -= 1 }

    if (dir.lengthSq() > 0) {
      dir.normalize()
      const next = groupRef.current.position.clone().addScaledVector(dir, PLAYER_SPEED * delta)
      next.x = Math.max(-ROOM_BOUND, Math.min(ROOM_BOUND, next.x))
      next.z = Math.max(-ROOM_BOUND, Math.min(ROOM_BOUND, next.z))
      groupRef.current.position.copy(next)
      facingAngle.current = Math.atan2(dir.x, dir.z)
    }

    const cur = groupRef.current.rotation.y
    let diff = facingAngle.current - cur
    diff = ((diff + Math.PI) % (Math.PI * 2)) - Math.PI
    groupRef.current.rotation.y += diff * Math.min(1, 12 * delta)
    onPositionChange(groupRef.current.position)
  })

  return (
    <group ref={groupRef} position={[0, 0, 2.5]}>
      <primitive object={cloned} scale={1} />
    </group>
  )
}

// ─── Proximity triggers ───────────────────────────────────────────────────────

const BOARD_POS  = new THREE.Vector3(-1.5, 0, -3.8)
const DESK_POS   = new THREE.Vector3(3.0,  0, -1.5)

function ProximityHints({ playerPos, onBoard, onDesk }: {
  playerPos: React.MutableRefObject<THREE.Vector3>
  onBoard: () => void
  onDesk: () => void
}) {
  const [nearBoard, setNearBoard] = useState(false)
  const [nearDesk, setNearDesk]   = useState(false)

  useFrame(() => {
    const nb = playerPos.current.distanceTo(BOARD_POS) < 2.5
    const nd = playerPos.current.distanceTo(DESK_POS)  < 2.5
    setNearBoard(nb)
    setNearDesk(nd)
  })

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== 'e') return
      if (nearBoard) onBoard()
      else if (nearDesk) onDesk()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [nearBoard, nearDesk, onBoard, onDesk])

  return (
    <>
      {nearBoard && (
        <Html position={[-1.5, 2.2, -3.8]} center distanceFactor={12}>
          <div style={{
            color: '#d4b483', fontSize: 11, letterSpacing: 2,
            background: 'rgba(0,0,0,0.85)', padding: '4px 12px',
            fontFamily: '"Courier New", monospace',
            border: '1px solid #d4b48344', whiteSpace: 'nowrap',
          }}>
            E — CASE BOARD
          </div>
        </Html>
      )}
      {nearDesk && (
        <Html position={[3.0, 2.2, -2.0]} center distanceFactor={12}>
          <div style={{
            color: '#88cc88', fontSize: 11, letterSpacing: 2,
            background: 'rgba(0,0,0,0.85)', padding: '4px 12px',
            fontFamily: '"Courier New", monospace',
            border: '1px solid #88cc8844', whiteSpace: 'nowrap',
          }}>
            E — EVIDENCE COMPUTER
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
        background: 'rgba(0,0,0,0.88)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: '"Courier New", monospace',
      }} onClick={onClose}>
        <div style={{
          background: '#0a0f0a', border: '2px solid #1a3a1a',
          padding: '30px 40px', color: '#336633', fontSize: 13, letterSpacing: 3,
        }}>
          NO ACTIVE CASE — GO TO CASE BOARD FIRST
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
        background: 'rgba(0,0,0,0.9)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: '"Courier New", monospace',
      }}
      onClick={onClose}
    >
      {/* Monitor frame */}
      <div
        style={{
          width: 720, maxWidth: '90vw', maxHeight: '85vh',
          background: '#111', border: '12px solid #1e1e1e',
          borderRadius: 6,
          boxShadow: '0 0 60px rgba(0,0,0,0.9), inset 0 0 30px rgba(0,0,0,0.5)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Monitor top bar */}
        <div style={{
          background: 'linear-gradient(90deg, #0a140a, #081008)',
          borderBottom: '1px solid #1a3a1a',
          padding: '6px 16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#0a4a0a' }} />
            <div style={{ fontSize: 9, color: '#55aa55', letterSpacing: 3 }}>
              PRECINCT 7 — EVIDENCE TERMINAL
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', color: '#336633',
            cursor: 'pointer', fontSize: 14, fontFamily: 'inherit',
          }}>✕</button>
        </div>

        {/* Screen content */}
        <div style={{
          flex: 1, padding: 18, display: 'flex', gap: 16,
          background: '#0a0f0a', overflow: 'hidden',
          color: '#88cc88',
        }}>
          {/* Left: suspects */}
          <div style={{ width: 200, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 8, color: '#336633', letterSpacing: 3, marginBottom: 4 }}>
              SUSPECTS
            </div>
            {npcs.map((npc) => {
              const count = (suspectEvidence[npc.id] ?? []).length
              return (
                <button
                  key={npc.id}
                  onClick={() => setSelectedSuspect(npc.id === selectedSuspect ? null : npc.id)}
                  style={{
                    background: selectedSuspect === npc.id ? '#0d200d' : 'transparent',
                    border: `1px solid ${selectedSuspect === npc.id ? '#55aa55' : '#1a3a1a'}`,
                    padding: '8px 10px', cursor: 'pointer',
                    textAlign: 'left', fontFamily: 'inherit',
                    transition: 'all 0.1s',
                  }}
                >
                  <div style={{ fontSize: 11, color: selectedSuspect === npc.id ? '#88cc88' : '#55aa55' }}>
                    {npc.name}
                  </div>
                  <div style={{ fontSize: 8, color: '#336633', marginTop: 2 }}>
                    {npc.occupation}
                  </div>
                  {count > 0 && (
                    <div style={{
                      marginTop: 5, display: 'inline-block',
                      background: '#55aa55', color: '#0a0f0a',
                      fontSize: 8, padding: '1px 6px', letterSpacing: 1,
                    }}>
                      {count} PROOF{count > 1 ? 'S' : ''} PINNED
                    </div>
                  )}
                </button>
              )
            })}

            {/* Send to law */}
            <div style={{ flex: 1 }} />
            {selectedSuspect && (
              <>
                {pinnedForSelected.length === 0 && (
                  <div style={{ fontSize: 8, color: '#886622', letterSpacing: 1, lineHeight: 1.4 }}>
                    ⚠ Pin at least one proof before filing
                  </div>
                )}
                <button
                  onClick={() => onSendToLaw(selectedSuspect, pinnedForSelected)}
                  style={{
                    background: pinnedForSelected.length > 0 ? '#3a0000' : '#111',
                    border: `2px solid ${pinnedForSelected.length > 0 ? '#ff0055' : '#1a3a1a'}`,
                    color: pinnedForSelected.length > 0 ? '#ff4477' : '#336633',
                    padding: '10px 8px', cursor: 'pointer',
                    fontFamily: 'inherit', fontSize: 10, letterSpacing: 2,
                    lineHeight: 1.4,
                    boxShadow: pinnedForSelected.length > 0 ? '0 0 16px rgba(255,0,85,0.2)' : 'none',
                  }}
                >
                  ⚖ SEND TO<br />LAW
                </button>
              </>
            )}
          </div>

          {/* Divider */}
          <div style={{ width: 1, background: '#1a3a1a' }} />

          {/* Right: evidence list */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, overflow: 'auto' }}>
            <div style={{ fontSize: 8, color: '#336633', letterSpacing: 3, marginBottom: 4 }}>
              {selectedSuspect
                ? `PIN PROOF TO ${npcs.find(n => n.id === selectedSuspect)?.name.toUpperCase()}`
                : 'SELECT A SUSPECT ON THE LEFT'}
            </div>

            {collectedEvidence.length === 0 && (
              <div style={{
                fontSize: 11, color: '#225522', fontStyle: 'italic',
                padding: '20px 0',
              }}>
                No evidence collected yet.<br />
                Investigate locations in the city first.
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
                    border: `1px solid ${pinned ? '#55aa55' : '#1a3a1a'}`,
                    padding: '8px 12px',
                    background: pinned ? 'rgba(85,170,85,0.08)' : 'transparent',
                    cursor: canToggle ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', gap: 10,
                    opacity: !canToggle ? 0.5 : 1,
                    transition: 'all 0.12s',
                  }}
                >
                  {/* Checkbox */}
                  <div style={{
                    width: 14, height: 14, flexShrink: 0,
                    border: `1px solid ${pinned ? '#55aa55' : '#225522'}`,
                    background: pinned ? '#55aa55' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, color: '#0a0f0a',
                  }}>
                    {pinned ? '✓' : ''}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: pinned ? '#88cc88' : '#55aa55', marginBottom: 2 }}>
                      {ev.name}
                    </div>
                    <div style={{ fontSize: 9, color: '#336633' }}>
                      Found at: {ev.found_at}
                    </div>
                    <div style={{ fontSize: 9, color: '#225522', marginTop: 2, lineHeight: 1.4 }}>
                      {ev.description}
                    </div>
                  </div>

                  {pinned && (
                    <div style={{
                      fontSize: 8, color: '#55aa55', letterSpacing: 1,
                      background: 'rgba(85,170,85,0.1)', padding: '2px 6px',
                      border: '1px solid #55aa5533',
                    }}>
                      PINNED
                    </div>
                  )}
                </div>
              )
            })}
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

  // Auto-generate world on first load
  useEffect(() => {
    if (world) return
    loadWorld()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
        <OfficeRoom />
        <FollowCamera target={playerPos.current} />
        <ProximityHints
          playerPos={playerPos}
          onBoard={() => setShowBoard(true)}
          onDesk={() => setShowComputer(true)}
        />
        <Suspense fallback={
          <group position={[0, 0, 2.5]}>
            <mesh position={[0, 0.5, 0]}>
              <capsuleGeometry args={[0.15, 0.4, 8, 16]} />
              <meshLambertMaterial color="#4488cc" />
            </mesh>
          </group>
        }>
          <OfficePlayer onPositionChange={(p) => playerPos.current.copy(p)} />
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
          {currentCase && (
            <button
              onClick={() => setPhase('city')}
              style={{
                background: '#3a0a00', border: '1px solid #d4b483',
                color: '#d4b483', padding: '5px 16px', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 10, letterSpacing: 2,
                boxShadow: '0 0 10px rgba(212,180,131,0.15)',
              }}
            >
              GO INVESTIGATE →
            </button>
          )}
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
