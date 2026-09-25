import { useEffect, useRef } from 'react'
import {
  applyPointerForce,
  buildDotGrid,
  dotFieldOptions,
  stepDotField,
  type Dot,
} from '../lib/dotField'

const TAU = Math.PI * 2

/** Resting dot radius, in CSS px. */
const DOT_RADIUS = 1.5
/** Resting opacity of the lattice. */
const BASE_ALPHA = 0.3
/** Opacity and extra radius for the dots inside the pointer radius. */
const HIGHLIGHT_ALPHA = 0.85
const HIGHLIGHT_GROWTH = 2.2
/** Longest step the easing will integrate, in seconds — survives tab stalls. */
const MAX_STEP = 1 / 20

interface CapsuleDotFieldProps {
  /** Freezes the field to a still lattice: no pointer tracking, no redraws. */
  reducedMotion: boolean
  className?: string
}

/**
 * Blue dot lattice painted behind the capsule. Dots inside the pointer radius
 * slide away from the cursor and brighten, then ease back into the grid once it
 * passes — an "anti-gravity" nudge that never swallows scroll or clicks, since
 * the layer is inert and the pointer is read from the window.
 *
 * Colours come from the theme's accent tokens, so light and dark both stay in
 * palette without hardcoding a blue.
 */
export function CapsuleDotField({ reducedMotion, className }: CapsuleDotFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return

    let dots: Dot[] = []
    let pointer: { x: number; y: number } | null = null
    let colors = { base: '#579ad9', highlight: '#2f6fa8' }
    let width = 0
    let height = 0
    let frame = 0
    let dirty = false
    let lastTime = 0

    const readColors = () => {
      const styles = getComputedStyle(canvas)
      colors = {
        base: styles.getPropertyValue('--accent').trim() || colors.base,
        highlight: styles.getPropertyValue('--accent-strong').trim() || colors.highlight,
      }
    }

    const paint = () => {
      context.clearRect(0, 0, width, height)

      // The whole lattice goes down as one path: a single fill for ~1k dots.
      context.globalAlpha = BASE_ALPHA
      context.fillStyle = colors.base
      context.beginPath()
      for (const dot of dots) {
        const x = dot.x + dot.dx
        const y = dot.y + dot.dy
        context.moveTo(x + DOT_RADIUS, y)
        context.arc(x, y, DOT_RADIUS, 0, TAU)
      }
      context.fill()

      if (pointer) {
        context.globalAlpha = HIGHLIGHT_ALPHA
        context.fillStyle = colors.highlight
        context.beginPath()
        for (const dot of dots) {
          const x = dot.x + dot.dx
          const y = dot.y + dot.dy
          const distance = Math.hypot(x - pointer.x, y - pointer.y)
          if (distance >= dotFieldOptions.radius) continue
          const radius = DOT_RADIUS + (1 - distance / dotFieldOptions.radius) * HIGHLIGHT_GROWTH
          context.moveTo(x + radius, y)
          context.arc(x, y, radius, 0, TAU)
        }
        context.fill()
      }

      context.globalAlpha = 1
    }

    const render = (time: number) => {
      frame = 0
      const dt = lastTime ? Math.min((time - lastTime) / 1000, MAX_STEP) : 0
      lastTime = time

      const moving = stepDotField(dots, dt)
      if (moving || dirty) paint()
      dirty = false

      // Idle once the lattice has settled — scrolling and reading cost nothing.
      if (moving) {
        frame = window.requestAnimationFrame(render)
      } else {
        lastTime = 0
      }
    }

    const scheduleFrame = () => {
      if (frame) return
      frame = window.requestAnimationFrame(render)
    }

    const resize = () => {
      const nextWidth = canvas.clientWidth
      const nextHeight = canvas.clientHeight
      if (nextWidth <= 0 || nextHeight <= 0) return

      const dpr = window.devicePixelRatio || 1
      width = nextWidth
      height = nextHeight
      canvas.width = Math.round(nextWidth * dpr)
      canvas.height = Math.round(nextHeight * dpr)
      context.setTransform(dpr, 0, 0, dpr, 0, 0)

      // Keep the on-screen density roughly constant across viewports.
      const spacing = Math.min(Math.max(Math.round(nextWidth / 36), 30), 46)
      dots = buildDotGrid(width, height, spacing)
      applyPointerForce(dots, pointer)

      dirty = true
      paint()
    }

    const handlePointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      const inside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom

      // Nothing to repaint while the cursor is away from the hero and stays away.
      if (!inside && !pointer) return

      pointer = inside ? { x: event.clientX - rect.left, y: event.clientY - rect.top } : null
      applyPointerForce(dots, pointer)
      dirty = true
      scheduleFrame()
    }

    const handlePointerLeave = () => {
      if (!pointer) return
      pointer = null
      applyPointerForce(dots, null)
      dirty = true
      scheduleFrame()
    }

    const themeObserver = new MutationObserver(() => {
      readColors()
      dirty = true
      scheduleFrame()
      paint()
    })

    readColors()
    resize()

    window.addEventListener('resize', resize)
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    if (!reducedMotion) {
      window.addEventListener('pointermove', handlePointerMove, { passive: true })
      window.addEventListener('pointerleave', handlePointerLeave)
      document.addEventListener('pointerleave', handlePointerLeave)
    }

    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerleave', handlePointerLeave)
      document.removeEventListener('pointerleave', handlePointerLeave)
      themeObserver.disconnect()
    }
  }, [reducedMotion])

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />
}
