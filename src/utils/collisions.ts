export interface Collider {
  x: number
  z: number
  hw: number // half-width  (along X)
  hd: number // half-depth  (along Z)
}

const PLAYER_RADIUS = 0.55

/**
 * AABB vs circle collision resolution. Finds the closest point on
 * the box to the player circle and pushes the player out if overlapping.
 */
export function resolveCollisions(
  px: number,
  pz: number,
  colliders: readonly Collider[],
  playerRadius = PLAYER_RADIUS,
): [number, number] {
  let rx = px
  let rz = pz
  const skipDist = 8
  for (let iter = 0; iter < 3; iter++) {
    for (let i = 0; i < colliders.length; i++) {
      const c = colliders[i]
      if (Math.abs(rx - c.x) > skipDist || Math.abs(rz - c.z) > skipDist) continue
      const closestX = Math.max(c.x - c.hw, Math.min(rx, c.x + c.hw))
      const closestZ = Math.max(c.z - c.hd, Math.min(rz, c.z + c.hd))
      const dx = rx - closestX
      const dz = rz - closestZ
      const distSq = dx * dx + dz * dz
      if (distSq < playerRadius * playerRadius && distSq > 0.0001) {
        const dist = Math.sqrt(distSq)
        const push = playerRadius - dist
        rx += (dx / dist) * push
        rz += (dz / dist) * push
      }
    }
  }
  return [rx, rz]
}
