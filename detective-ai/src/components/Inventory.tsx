import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useGameStore } from '../store/gameStore'
import type { EvidenceItem } from '../store/gameStore'

// ─── helpers ────────────────────────────────────────────────────────────────

function isDocumentItem(item: EvidenceItem): boolean {
  const text = `${item.name} ${item.description}`.toLowerCase()
  return /letter|note|document|report|diary|journal|newspaper|photograph|photo|map|receipt|telegram|ticket|card|certificate|will|page|paper|file|memo|ledger|book|manuscript|contract|invoice|register|log|entry|scroll|pamphlet|flyer|poster|envelope|message|dispatch/.test(
    text
  )
}

function getItemTypeLabel(item: EvidenceItem): string {
  const text = `${item.name} ${item.description}`.toLowerCase()
  if (isDocumentItem(item)) return 'DOCUMENT'
  if (/gun|pistol|revolver|rifle/.test(text)) return 'WEAPON'
  if (/knife|blade|dagger|sword/.test(text)) return 'WEAPON'
  if (/bottle|vial|flask/.test(text)) return 'CONTAINER'
  if (/ring|bracelet|necklace|jewelry|jewel/.test(text)) return 'JEWELRY'
  if (/key/.test(text)) return 'KEY'
  if (/watch|clock/.test(text)) return 'TIMEPIECE'
  if (/rope|cord|wire/.test(text)) return 'CORD'
  if (/shoe|boot|glove/.test(text)) return 'GARMENT'
  if (/handkerchief|cloth|fabric|scarf/.test(text)) return 'FABRIC'
  return 'OBJECT'
}

// ─── 3-D shapes ─────────────────────────────────────────────────────────────

function ItemMesh({ item }: { item: EvidenceItem }) {
  const text = `${item.name} ${item.description}`.toLowerCase()

  if (/gun|pistol|revolver|rifle/.test(text)) {
    return (
      <group>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1.0, 0.22, 0.14]} />
          <meshStandardMaterial color="#333" metalness={0.9} roughness={0.15} />
        </mesh>
        <mesh position={[0.05, -0.24, 0]}>
          <boxGeometry args={[0.22, 0.46, 0.12]} />
          <meshStandardMaterial color="#2a2a2a" metalness={0.85} roughness={0.2} />
        </mesh>
      </group>
    )
  }

  if (/knife|blade|dagger|sword/.test(text)) {
    return (
      <group>
        <mesh position={[0.12, 0, 0]}>
          <boxGeometry args={[0.9, 0.07, 0.03]} />
          <meshStandardMaterial color="#aaa" metalness={0.96} roughness={0.04} />
        </mesh>
        <mesh position={[-0.45, 0, 0]}>
          <boxGeometry args={[0.2, 0.18, 0.06]} />
          <meshStandardMaterial color="#8B6914" metalness={0.5} roughness={0.5} />
        </mesh>
      </group>
    )
  }

  if (/bottle|vial|flask/.test(text)) {
    return (
      <group>
        <mesh position={[0, -0.12, 0]}>
          <cylinderGeometry args={[0.18, 0.22, 0.65, 14]} />
          <meshStandardMaterial
            color="#2a5a2a"
            metalness={0.05}
            roughness={0.05}
            transparent
            opacity={0.75}
          />
        </mesh>
        <mesh position={[0, 0.38, 0]}>
          <cylinderGeometry args={[0.07, 0.12, 0.24, 10]} />
          <meshStandardMaterial
            color="#2a5a2a"
            metalness={0.05}
            roughness={0.05}
            transparent
            opacity={0.75}
          />
        </mesh>
      </group>
    )
  }

  if (/ring|bracelet|necklace|jewelry|jewel/.test(text)) {
    return (
      <mesh>
        <torusGeometry args={[0.38, 0.09, 18, 48]} />
        <meshStandardMaterial color="#d4b483" metalness={0.95} roughness={0.05} />
      </mesh>
    )
  }

  if (/key/.test(text)) {
    return (
      <group>
        <mesh position={[0.38, 0, 0]}>
          <boxGeometry args={[0.72, 0.07, 0.04]} />
          <meshStandardMaterial color="#b8a060" metalness={0.88} roughness={0.12} />
        </mesh>
        <mesh position={[-0.16, 0, 0]}>
          <torusGeometry args={[0.2, 0.05, 10, 24]} />
          <meshStandardMaterial color="#b8a060" metalness={0.88} roughness={0.12} />
        </mesh>
        <mesh position={[0.12, -0.12, 0]}>
          <boxGeometry args={[0.07, 0.18, 0.04]} />
          <meshStandardMaterial color="#b8a060" metalness={0.88} roughness={0.12} />
        </mesh>
        <mesh position={[0.26, -0.12, 0]}>
          <boxGeometry args={[0.07, 0.14, 0.04]} />
          <meshStandardMaterial color="#b8a060" metalness={0.88} roughness={0.12} />
        </mesh>
      </group>
    )
  }

  if (/watch|clock/.test(text)) {
    return (
      <group>
        <mesh>
          <cylinderGeometry args={[0.32, 0.32, 0.1, 40]} />
          <meshStandardMaterial color="#444" metalness={0.85} roughness={0.15} />
        </mesh>
        <mesh position={[0, 0.06, 0]}>
          <cylinderGeometry args={[0.26, 0.26, 0.02, 40]} />
          <meshStandardMaterial color="#f0f0f0" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.08, 0]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.16, 0.02, 0.01]} />
          <meshStandardMaterial color="#222" />
        </mesh>
      </group>
    )
  }

  if (/rope|cord|wire/.test(text)) {
    return (
      <mesh>
        <torusKnotGeometry args={[0.3, 0.065, 80, 10]} />
        <meshStandardMaterial color="#7a5c2a" roughness={0.85} />
      </mesh>
    )
  }

  if (/handkerchief|cloth|fabric|glove|scarf/.test(text)) {
    return (
      <mesh rotation={[0.4, 0, 0.25]}>
        <planeGeometry args={[0.85, 0.85, 6, 6]} />
        <meshStandardMaterial color="#e8dcc8" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
    )
  }

  if (/shoe|boot/.test(text)) {
    return (
      <group>
        <mesh position={[0, -0.05, 0.1]}>
          <boxGeometry args={[0.7, 0.22, 0.9]} />
          <meshStandardMaterial color="#2a1a0a" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.2, -0.25]}>
          <boxGeometry args={[0.65, 0.4, 0.4]} />
          <meshStandardMaterial color="#2a1a0a" roughness={0.7} />
        </mesh>
      </group>
    )
  }

  // Default mysterious box
  return (
    <mesh>
      <boxGeometry args={[0.65, 0.65, 0.65]} />
      <meshStandardMaterial color="#d4b483" metalness={0.25} roughness={0.65} />
    </mesh>
  )
}

function RotatingItem3D({ item }: { item: EvidenceItem }) {
  const groupRef = useRef<THREE.Group>(null)
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.55
    }
  })
  return (
    <group ref={groupRef}>
      <ItemMesh item={item} />
    </group>
  )
}

function Item3DViewer({ item }: { item: EvidenceItem }) {
  return (
    <Canvas
      style={{ width: '100%', height: '100%', background: 'transparent' }}
      camera={{ position: [0, 0.6, 2.2], fov: 42 }}
      gl={{ alpha: true, antialias: true }}
    >
      <ambientLight intensity={0.3} color="#1a1a4a" />
      <pointLight position={[2.5, 3, 2]} intensity={2.2} color="#ff0055" />
      <pointLight position={[-2, 1, 2]} intensity={1.4} color="#4040ff" />
      <pointLight position={[0, -1, 1]} intensity={0.8} color="#d4b483" />
      {/* subtle floor plane for shadow feel */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.7, 0]}>
        <planeGeometry args={[4, 4]} />
        <meshStandardMaterial color="#08081a" roughness={1} />
      </mesh>
      <RotatingItem3D item={item} />
      <OrbitControls enablePan={false} enableZoom={true} minDistance={1} maxDistance={5} />
    </Canvas>
  )
}

// ─── Document viewer ─────────────────────────────────────────────────────────

function DocumentViewer({ item }: { item: EvidenceItem }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px 10px',
        boxSizing: 'border-box',
        overflowY: 'auto',
      }}
    >
      {/* Paper */}
      <div
        style={{
          background: '#f5f0e0',
          color: '#1a1008',
          padding: '32px 36px',
          maxWidth: 420,
          width: '100%',
          fontFamily: '"Courier New", monospace',
          boxShadow: '0 4px 32px rgba(0,0,0,0.7), inset 0 0 30px rgba(0,0,0,0.06)',
          position: 'relative',
          border: '1px solid #d4c89a',
        }}
      >
        {/* Aged overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'300\' height=\'300\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'300\' height=\'300\' filter=\'url(%23n)\' opacity=\'0.04\'/%3E%3C/svg%3E")',
            pointerEvents: 'none',
            opacity: 0.6,
          }}
        />

        {/* Top decoration */}
        <div
          style={{
            textAlign: 'center',
            borderBottom: '1px solid #c4b47a',
            paddingBottom: 16,
            marginBottom: 22,
          }}
        >
          <div style={{ fontSize: 9, letterSpacing: 4, color: '#7a6030', marginBottom: 6 }}>
            ◆ ◆ ◆
          </div>
          <div style={{ fontSize: 10, letterSpacing: 3, color: '#8a7040', textTransform: 'uppercase' }}>
            {getItemTypeLabel(item)}
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 17,
            fontWeight: 'bold',
            color: '#1a1008',
            marginBottom: 8,
            letterSpacing: 0.5,
            lineHeight: 1.3,
          }}
        >
          {item.name}
        </div>

        {/* Found at */}
        <div
          style={{
            fontSize: 10,
            color: '#7a6030',
            letterSpacing: 2,
            marginBottom: 22,
            textTransform: 'uppercase',
          }}
        >
          Found at: {item.found_at}
        </div>

        {/* Body text */}
        <div
          style={{
            fontSize: 13,
            lineHeight: 2,
            color: '#2a1e0a',
            fontStyle: 'italic',
            borderLeft: '2px solid #c4b47a',
            paddingLeft: 14,
            marginBottom: 20,
          }}
        >
          {item.description}
        </div>

        {/* Bottom */}
        <div
          style={{
            borderTop: '1px solid #c4b47a',
            paddingTop: 14,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: 9, color: '#7a6030', letterSpacing: 2 }}>
            EVIDENCE #{item.id.slice(-4).toUpperCase()}
          </div>
          {item.links_to && (
            <div
              style={{
                fontSize: 9,
                color: '#8B0000',
                letterSpacing: 1,
                padding: '2px 6px',
                border: '1px solid #8B000044',
                background: 'rgba(139,0,0,0.06)',
              }}
            >
              LINKS TO SUSPECT
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Inventory component ────────────────────────────────────────────────

export default function Inventory() {
  const {
    collectedEvidence,
    inventoryOpen,
    selectedInventoryItem,
    closeInventory,
    selectInventoryItem,
  } = useGameStore()

  // Auto-select first item when opening
  useEffect(() => {
    if (inventoryOpen && !selectedInventoryItem && collectedEvidence.length > 0) {
      selectInventoryItem(collectedEvidence[0])
    }
  }, [inventoryOpen, selectedInventoryItem, collectedEvidence, selectInventoryItem])

  // Keyboard: Escape to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeInventory()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeInventory])

  if (!inventoryOpen) return null

  const isDoc = selectedInventoryItem ? isDocumentItem(selectedInventoryItem) : false

  return (
    <div
      onClick={closeInventory}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'rgba(2,2,10,0.88)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '"Courier New", monospace',
      }}
    >
      {/* Scanlines */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: 0.018,
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, #fff 2px, #fff 3px)',
        }}
      />

      {/* Modal panel */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(880px, 92vw)',
          height: 'min(600px, 88vh)',
          background: '#06060f',
          border: '1px solid #d4b48322',
          boxShadow: '0 0 80px rgba(212,180,131,0.08), 0 0 0 1px #d4b48311',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 18px',
            borderBottom: '1px solid #1a1a2e',
            background: 'rgba(3,3,12,0.9)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 10, color: '#d4b483', letterSpacing: 3 }}>◆ EVIDENCE</span>
            <span style={{ fontSize: 10, color: '#444', letterSpacing: 1 }}>
              {collectedEvidence.length} item{collectedEvidence.length !== 1 ? 's' : ''} collected
            </span>
          </div>
          <button
            onClick={closeInventory}
            style={{
              background: 'transparent',
              border: '1px solid #2a2a3a',
              color: '#555',
              padding: '3px 10px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 10,
              letterSpacing: 1,
            }}
          >
            ESC
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* ── Left: grid ── */}
          <div
            style={{
              width: 240,
              flexShrink: 0,
              borderRight: '1px solid #1a1a2e',
              overflowY: 'auto',
              padding: '14px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {collectedEvidence.length === 0 ? (
              <div
                style={{
                  color: '#333',
                  fontSize: 11,
                  letterSpacing: 1,
                  textAlign: 'center',
                  marginTop: 40,
                  lineHeight: 2,
                }}
              >
                No evidence collected yet.
                <br />
                Examine objects in interiors.
              </div>
            ) : (
              <>
                <div style={{ fontSize: 9, color: '#444', letterSpacing: 2, marginBottom: 4 }}>
                  COLLECTED EVIDENCE
                </div>

                {/* Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 6,
                  }}
                >
                  {collectedEvidence.map((item) => {
                    const selected = selectedInventoryItem?.id === item.id
                    const isDoc = isDocumentItem(item)
                    return (
                      <button
                        key={item.id}
                        onClick={() => selectInventoryItem(item)}
                        title={item.name}
                        style={{
                          background: selected ? 'rgba(212,180,131,0.12)' : 'rgba(255,255,255,0.02)',
                          border: `1px solid ${selected ? '#d4b483' : '#2a2a3a'}`,
                          color: selected ? '#d4b483' : '#555',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          padding: '10px 4px 8px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 5,
                          transition: 'all 0.12s',
                          aspectRatio: '1',
                          justifyContent: 'center',
                        }}
                        onMouseEnter={(e) => {
                          if (!selected) {
                            const el = e.currentTarget as HTMLElement
                            el.style.borderColor = '#d4b48366'
                            el.style.color = '#d4b483aa'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!selected) {
                            const el = e.currentTarget as HTMLElement
                            el.style.borderColor = '#2a2a3a'
                            el.style.color = '#555'
                          }
                        }}
                      >
                        <span style={{ fontSize: 16, lineHeight: 1 }}>
                          {isDoc ? '▤' : '◈'}
                        </span>
                        <span
                          style={{
                            fontSize: 8,
                            letterSpacing: 0.5,
                            textAlign: 'center',
                            lineHeight: 1.3,
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical' as const,
                          }}
                        >
                          {item.name}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          {/* ── Right: preview ── */}
          <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
            {!selectedInventoryItem ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: '#2a2a3a',
                  fontSize: 12,
                  letterSpacing: 2,
                }}
              >
                SELECT AN ITEM
              </div>
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                {isDoc ? (
                  // Document reader
                  <DocumentViewer item={selectedInventoryItem} />
                ) : (
                  // 3D viewer
                  <div style={{ flex: 1, position: 'relative' }}>
                    {/* Subtle grid bg */}
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage:
                          'linear-gradient(#1a1a2e11 1px, transparent 1px), linear-gradient(90deg, #1a1a2e11 1px, transparent 1px)',
                        backgroundSize: '32px 32px',
                        pointerEvents: 'none',
                      }}
                    />
                    <Item3DViewer item={selectedInventoryItem} />

                    {/* Item info overlay at bottom */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        padding: '14px 20px',
                        background:
                          'linear-gradient(transparent, rgba(6,6,15,0.95) 40%)',
                        pointerEvents: 'none',
                      }}
                    >
                      <div
                        style={{
                          fontSize: 9,
                          color: '#8B6914',
                          letterSpacing: 3,
                          marginBottom: 4,
                          textTransform: 'uppercase',
                        }}
                      >
                        {getItemTypeLabel(selectedInventoryItem)} ·{' '}
                        {selectedInventoryItem.found_at}
                      </div>
                      <div style={{ fontSize: 14, color: '#d4b483', fontWeight: 'bold', marginBottom: 4 }}>
                        {selectedInventoryItem.name}
                      </div>
                      <div style={{ fontSize: 11, color: '#7a6030', lineHeight: 1.6, fontStyle: 'italic' }}>
                        {selectedInventoryItem.description}
                      </div>
                      {selectedInventoryItem.links_to && (
                        <div
                          style={{
                            marginTop: 8,
                            fontSize: 9,
                            color: '#ff0055',
                            letterSpacing: 2,
                            display: 'inline-block',
                            padding: '2px 8px',
                            border: '1px solid #ff005533',
                            background: 'rgba(255,0,85,0.06)',
                          }}
                        >
                          ◆ LINKS TO SUSPECT
                        </div>
                      )}
                    </div>

                    {/* Drag hint */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        fontSize: 9,
                        color: '#2a2a3a',
                        letterSpacing: 1,
                        pointerEvents: 'none',
                      }}
                    >
                      DRAG TO ROTATE
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
