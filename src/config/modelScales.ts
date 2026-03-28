/**
 * Native bounding-box heights (Y) of Kenney GLB assets (measured from files):
 *
 *   characters   ≈ 0.67
 *   roads        ≈ 0.02  (1 × 1 tile footprint)
 *   lamps        ≈ 0.60
 *   cars         ≈ 1.25 – 1.65
 *   buildings    ≈ 0.89 – 5.47
 *
 * WORLD_SCALE is the base multiplier applied to environment props (roads,
 * buildings, lamps) so a 1-unit road tile becomes 2 world-units wide.
 * Other categories are tuned relative to that so proportions look right
 * from the isometric-ish camera.
 */

export const WORLD_SCALE = 6

export const SCALE = {
  /** Roads, intersections – 1 tile = WORLD_SCALE world-units */
  road: WORLD_SCALE,

  /** Story buildings & skyscrapers */
  building: WORLD_SCALE * 0.5,

  /** Filler / low-detail background buildings */
  fillerBuilding: WORLD_SCALE * 0.55,

  /** Street lamps */
  lamp: WORLD_SCALE,

  /** Parked cars (slightly smaller than environment so they fit on roads) */
  car: WORLD_SCALE * 0.15,

  /** Player & NPC characters – scaled up so they're visible next to W=2 buildings */
  character: WORLD_SCALE * 0.15,
} as const
