export interface Point {
  x: number
  y: number
}

export interface Dot {
  /** Home position on the lattice, in CSS px. */
  x: number
  y: number
  /** Current offset from home, in CSS px. */
  dx: number
  dy: number
  /** Offset the dot is easing toward — set by applyPointerForce. */
  tx: number
  ty: number
}

export interface DotFieldOptions {
  /** Pointer influence radius, in CSS px. */
  radius: number
  /** Offset applied to a dot sitting directly under the pointer, in CSS px. */
  strength: number
  /** How quickly dots chase their target, per second. */
  easing: number
}

export const dotFieldOptions: DotFieldOptions = {
  radius: 130,
  strength: 30,
  easing: 8,
}

/** Distance below which a dot is treated as settled on its target, in px. */
const SETTLED_OFFSET = 0.05

/**
 * Lays out a centred lattice of resting dots covering the surface. The lattice
 * is inset by half the leftover space so the pattern stays symmetric at any
 * canvas size.
 */
export function buildDotGrid(width: number, height: number, spacing: number): Dot[] {
  if (width <= 0 || height <= 0 || spacing <= 0) return []

  const columns = Math.floor(width / spacing) + 1
  const rows = Math.floor(height / spacing) + 1
  const offsetX = (width - (columns - 1) * spacing) / 2
  const offsetY = (height - (rows - 1) * spacing) / 2

  const dots: Dot[] = []
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      dots.push({
        x: offsetX + column * spacing,
        y: offsetY + row * spacing,
        dx: 0,
        dy: 0,
        tx: 0,
        ty: 0,
      })
    }
  }

  return dots
}

/**
 * Aims every dot inside the pointer radius away from the cursor, strongest
 * directly underneath it. Dots outside the radius are released, and a null
 * pointer releases the whole field so it springs back to the lattice.
 *
 * Targets, not offsets, are written: stepDotField does the easing, which keeps
 * this call allocation-free and safe to run on every pointer event.
 */
export function applyPointerForce(
  dots: Dot[],
  pointer: Point | null,
  options: DotFieldOptions = dotFieldOptions,
): void {
  for (const dot of dots) {
    if (!pointer) {
      dot.tx = 0
      dot.ty = 0
      continue
    }

    const offsetX = dot.x + dot.dx - pointer.x
    const offsetY = dot.y + dot.dy - pointer.y
    const distance = Math.hypot(offsetX, offsetY)

    if (distance >= options.radius) {
      dot.tx = 0
      dot.ty = 0
      continue
    }

    // Dots exactly under the cursor have no away-vector to push along, so keep
    // them moving the way they already are instead of leaving one stuck.
    if (distance < 1e-3) {
      const heading = Math.hypot(dot.dx, dot.dy) || 1
      dot.tx = (dot.dx / heading) * options.strength
      dot.ty = (dot.dy / heading) * options.strength
      continue
    }

    const falloff = 1 - distance / options.radius
    const push = options.strength * falloff * falloff
    dot.tx = (offsetX / distance) * push
    dot.ty = (offsetY / distance) * push
  }
}

/**
 * Eases every dot toward its target and snaps it on arrival. Returns true while
 * any dot is still displaced, so the caller can idle its animation frame loop.
 *
 * The easing is exponential, so a single long step and two half steps land in
 * the same place — the field behaves the same at 60Hz and 144Hz.
 */
export function stepDotField(
  dots: Dot[],
  dt: number,
  easing: number = dotFieldOptions.easing,
): boolean {
  if (dots.length === 0) return false

  const factor = 1 - Math.exp(-Math.max(easing, 0) * Math.max(dt, 0))
  let moving = false

  for (const dot of dots) {
    dot.dx += (dot.tx - dot.dx) * factor
    dot.dy += (dot.ty - dot.dy) * factor

    const settledX = Math.abs(dot.tx - dot.dx) <= SETTLED_OFFSET
    const settledY = Math.abs(dot.ty - dot.dy) <= SETTLED_OFFSET

    if (settledX) dot.dx = dot.tx
    if (settledY) dot.dy = dot.ty
    if (!settledX || !settledY) moving = true
  }

  return moving
}
