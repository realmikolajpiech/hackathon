export interface Collider {
  x: number
  z: number
  radius: number
}

const PLAYER_RADIUS = 0.35

/**
 * Push-based circle collision resolution. Adjusts (px, pz) so the player
 * circle doesn't overlap any obstacle circle. Multiple iterations handle
 * chain pushes (e.g. pushed into a second obstacle).
 */
export function resolveCollisions(
  px: number,
  pz: number,
  colliders: readonly Collider[],
  playerRadius = PLAYER_RADIUS,
): [number, number] {
  let rx = px
  let rz = pz
  for (let iter = 0; iter < 3; iter++) {
    for (let i = 0; i < colliders.length; i++) {
      const c = colliders[i]
      const dx = rx - c.x
      const dz = rz - c.z
      const distSq = dx * dx + dz * dz
      const minDist = playerRadius + c.radius
      if (distSq < minDist * minDist && distSq > 0.0001) {
        const dist = Math.sqrt(distSq)
        const push = minDist - dist
        rx += (dx / dist) * push
        rz += (dz / dist) * push
      }
    }
  }
  return [rx, rz]
}
