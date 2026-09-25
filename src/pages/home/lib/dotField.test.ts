import { describe, expect, it } from 'vitest'
import {
  applyPointerForce,
  buildDotGrid,
  dotFieldOptions,
  stepDotField,
  type Dot,
} from './dotField'

/** Distance from a dot's *current* position to a point. */
function liveDistance(dot: Dot, point: { x: number; y: number }) {
  return Math.hypot(dot.x + dot.dx - point.x, dot.y + dot.dy - point.y)
}

/** Distance from a dot's resting position to a point. */
function homeDistance(dot: Dot, point: { x: number; y: number }) {
  return Math.hypot(dot.x - point.x, dot.y - point.y)
}

function targetLength(dot: Dot) {
  return Math.hypot(dot.tx, dot.ty)
}

describe('buildDotGrid', () => {
  it('returns nothing for a degenerate surface or spacing', () => {
    expect(buildDotGrid(0, 400, 34)).toEqual([])
    expect(buildDotGrid(400, 0, 34)).toEqual([])
    expect(buildDotGrid(400, 400, 0)).toEqual([])
    expect(buildDotGrid(-10, -10, 34)).toEqual([])
  })

  it('covers the surface on a lattice of the requested spacing', () => {
    // 340/34 = 10 columns of gap + 1, 200/34 = 5 rows of gap + 1.
    const dots = buildDotGrid(340, 200, 34)

    expect(dots).toHaveLength(11 * 6)
    expect(dots[1].x - dots[0].x).toBeCloseTo(34)
    for (const dot of dots) {
      expect(dot.x).toBeGreaterThanOrEqual(0)
      expect(dot.x).toBeLessThanOrEqual(340)
      expect(dot.y).toBeGreaterThanOrEqual(0)
      expect(dot.y).toBeLessThanOrEqual(200)
      // Everything starts at rest.
      expect([dot.dx, dot.dy, dot.tx, dot.ty]).toEqual([0, 0, 0, 0])
    }
  })

  it('centres the lattice so the margins match on both sides', () => {
    const dots = buildDotGrid(340, 200, 34)
    const xs = dots.map((dot) => dot.x)
    const ys = dots.map((dot) => dot.y)

    expect(Math.min(...xs)).toBeCloseTo(340 - Math.max(...xs))
    expect(Math.min(...ys)).toBeCloseTo(200 - Math.max(...ys))
  })

  it('spans the surface exactly when the spacing divides it', () => {
    const dots = buildDotGrid(340, 204, 34)

    expect(Math.min(...dots.map((dot) => dot.x))).toBe(0)
    expect(Math.max(...dots.map((dot) => dot.x))).toBe(340)
    expect(Math.min(...dots.map((dot) => dot.y))).toBe(0)
    expect(Math.max(...dots.map((dot) => dot.y))).toBe(204)
  })
})

describe('applyPointerForce', () => {
  const pointer = { x: 100, y: 100 }
  const radius = dotFieldOptions.radius

  /** Dots inside the radius and away from the degenerate centre case. */
  function pushedDots(dots: Dot[]) {
    return dots.filter((dot) => {
      const distance = homeDistance(dot, pointer)
      return distance > 0 && distance < radius
    })
  }

  it('aims dots inside the radius away from the pointer', () => {
    const dots = buildDotGrid(400, 400, 20)
    applyPointerForce(dots, pointer)

    const inRange = pushedDots(dots)
    expect(inRange.length).toBeGreaterThan(0)

    for (const dot of inRange) {
      const awayX = dot.x - pointer.x
      const awayY = dot.y - pointer.y
      expect(dot.tx * awayX + dot.ty * awayY).toBeGreaterThan(0)
    }
  })

  it('pushes hardest directly under the pointer and nothing past the radius', () => {
    const dots = buildDotGrid(400, 400, 20)
    applyPointerForce(dots, pointer)

    const inRange = pushedDots(dots)
    const nearest = inRange.reduce((best, dot) =>
      homeDistance(dot, pointer) < homeDistance(best, pointer) ? dot : best,
    )

    expect(targetLength(nearest)).toBeGreaterThan(0)
    for (const dot of inRange) {
      expect(targetLength(dot)).toBeLessThanOrEqual(targetLength(nearest))
      expect(targetLength(dot)).toBeLessThanOrEqual(dotFieldOptions.strength)
    }

    const outside = dots.filter((dot) => homeDistance(dot, pointer) >= radius)
    expect(outside.length).toBeGreaterThan(0)
    for (const dot of outside) {
      expect([dot.tx, dot.ty]).toEqual([0, 0])
    }
  })

  it('clears a previous push when the pointer moves on', () => {
    const dots = buildDotGrid(400, 400, 20)
    applyPointerForce(dots, pointer)
    expect(dots.some((dot) => targetLength(dot) > 0)).toBe(true)

    applyPointerForce(dots, { x: -500, y: -500 })

    expect(dots.every((dot) => dot.tx === 0 && dot.ty === 0)).toBe(true)
  })

  it('releases the whole field for a null pointer', () => {
    const dots = buildDotGrid(400, 400, 20)
    applyPointerForce(dots, pointer)
    applyPointerForce(dots, null)

    expect(dots.every((dot) => dot.tx === 0 && dot.ty === 0)).toBe(true)
  })

  it('keeps a displaced dot moving outward when the pointer sits on it', () => {
    // Current position lands exactly on the pointer, so there is no away-vector.
    const dot: Dot = { x: 97, y: 100, dx: 3, dy: 0, tx: 0, ty: 0 }
    applyPointerForce([dot], pointer)

    expect(dot.tx).toBeCloseTo(dotFieldOptions.strength)
    expect(dot.ty).toBeCloseTo(0)
  })

  it('never emits a non-finite target for a dot resting under the pointer', () => {
    const dot: Dot = { x: 100, y: 100, dx: 0, dy: 0, tx: 0, ty: 0 }
    applyPointerForce([dot], pointer)

    expect(Number.isFinite(dot.tx)).toBe(true)
    expect(Number.isFinite(dot.ty)).toBe(true)
  })

  it('never pulls a dot closer to the pointer than it started', () => {
    const dots = buildDotGrid(400, 400, 20)
    applyPointerForce(dots, pointer)
    stepDotField(dots, 1)

    for (const dot of dots) {
      expect(liveDistance(dot, pointer)).toBeGreaterThanOrEqual(
        homeDistance(dot, pointer) - 1e-9,
      )
    }
  })
})

describe('stepDotField', () => {
  it('reports nothing to do for an empty field', () => {
    expect(stepDotField([], 1 / 60)).toBe(false)
  })

  it('is at rest on a fresh lattice', () => {
    expect(stepDotField(buildDotGrid(300, 300, 30), 1 / 60)).toBe(false)
  })

  it('eases toward the target and settles on it exactly', () => {
    const dot: Dot = { x: 0, y: 0, dx: 0, dy: 0, tx: 10, ty: -20 }

    expect(stepDotField([dot], 1 / 60)).toBe(true)
    expect(dot.dx).toBeGreaterThan(0)
    expect(dot.dx).toBeLessThan(10)
    expect(dot.dy).toBeLessThan(0)
    expect(dot.dy).toBeGreaterThan(-20)

    expect(stepDotField([dot], 1)).toBe(false)
    expect(dot.dx).toBe(10)
    expect(dot.dy).toBe(-20)
  })

  it('does not move without elapsed time', () => {
    const dot: Dot = { x: 0, y: 0, dx: 0, dy: 0, tx: 10, ty: 0 }
    stepDotField([dot], 0)

    expect(dot.dx).toBe(0)
  })

  it('lands in the same place at 60Hz and 120Hz', () => {
    const slow: Dot = { x: 0, y: 0, dx: 0, dy: 0, tx: 40, ty: 40 }
    const fast: Dot = { x: 0, y: 0, dx: 0, dy: 0, tx: 40, ty: 40 }

    // Both loops integrate exactly 0.2s of easing.
    for (let i = 0; i < 12; i += 1) stepDotField([slow], 1 / 60)
    for (let i = 0; i < 24; i += 1) stepDotField([fast], 1 / 120)

    expect(fast.dx).toBeCloseTo(slow.dx, 9)
    expect(fast.dy).toBeCloseTo(slow.dy, 9)
  })

  it('returns the field to the lattice once the pointer is released', () => {
    const dots = buildDotGrid(400, 400, 20)
    applyPointerForce(dots, { x: 200, y: 200 })
    stepDotField(dots, 1 / 60)
    expect(dots.some((dot) => dot.dx !== 0 || dot.dy !== 0)).toBe(true)

    applyPointerForce(dots, null)
    expect(stepDotField(dots, 1)).toBe(false)
    expect(dots.every((dot) => dot.dx === 0 && dot.dy === 0)).toBe(true)
  })
})
