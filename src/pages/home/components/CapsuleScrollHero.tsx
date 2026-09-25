import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import {
  capsuleOverlaySpecs,
  collectCapsuleFramePaths,
  computeCapsuleOverlayState,
  frameIndexForProgress,
  loadCapsuleFrames,
  type CapsuleOverlaySpec,
  type LoadedCapsuleFrame,
} from '../lib/capsuleFrames'
import { CapsuleDotField } from './CapsuleDotField'

type CapsuleHeroStatus = 'loading' | 'ready' | 'empty' | 'error'

const statusCopy: Record<Exclude<CapsuleHeroStatus, 'ready'>, string> = {
  loading: 'Preparing capsule animation…',
  empty:
    'Capsule frames not found — add the Blender render sequence to src/assets/home/frames (see the README there).',
  error: 'Something went wrong while loading the capsule animation.',
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

/**
 * Overlay staging per transition. Every headline fades in place — only the
 * capsule moves. `top-24` clears the 5rem sticky page header, which overlaps
 * the top of the hero while it is scrolled through.
 */
const overlayPlacement: Record<CapsuleOverlaySpec['id'], string> = {
  opening: 'inset-x-0 top-24 flex justify-center px-6',
  lift: 'inset-0 flex items-center justify-center px-6',
  close: 'inset-x-0 bottom-[10%] flex justify-center px-6',
}

// The opening and lift headlines wear the theme's blue text token, which keeps
// its contrast against both the light and dark canvas.
const overlayTone: Record<CapsuleOverlaySpec['id'], string> = {
  opening: 'text-4xl sm:text-6xl text-accent-strong',
  lift: 'text-3xl sm:text-5xl text-accent-strong',
  close: 'text-3xl sm:text-5xl text-ink',
}

export function CapsuleScrollHero() {
  const sectionRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [frames, setFrames] = useState<LoadedCapsuleFrame[]>([])
  const [status, setStatus] = useState<CapsuleHeroStatus>('loading')
  const [loadState, setLoadState] = useState({ loaded: 0, total: 0 })
  const [activeIndex, setActiveIndex] = useState(0)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY)
    setReducedMotion(mediaQuery.matches)

    const handleChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches)
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    let cancelled = false

    const paths = collectCapsuleFramePaths()
    if (paths.length === 0) {
      setStatus('empty')
      return
    }

    setStatus('loading')
    setLoadState({ loaded: 0, total: paths.length })

    loadCapsuleFrames(paths, (loaded, total) => {
      if (!cancelled) setLoadState({ loaded, total })
    })
      .then((loadedFrames) => {
        if (cancelled) return
        setFrames(loadedFrames)
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      setCanvasSize({ width: canvas.clientWidth, height: canvas.clientHeight })
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const section = sectionRef.current
    if (!section || frames.length === 0) return

    if (reducedMotion) {
      setActiveIndex(frames.length - 1)
      return
    }

    let rafId = 0

    const updateIndex = () => {
      rafId = 0
      const rect = section.getBoundingClientRect()
      const scrollable = rect.height - window.innerHeight
      const progress =
        scrollable > 0 ? Math.min(Math.max(-rect.top / scrollable, 0), 1) : 0
      setActiveIndex(frameIndexForProgress(progress, frames.length))
    }

    const handleScroll = () => {
      if (rafId) return
      rafId = window.requestAnimationFrame(updateIndex)
    }

    updateIndex()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [frames, reducedMotion])

  useEffect(() => {
    const canvas = canvasRef.current
    const frame = frames[activeIndex]
    if (!canvas || !frame) return

    const context = canvas.getContext('2d')
    if (!context) return

    const dpr = window.devicePixelRatio || 1
    const { width, height } = canvasSize
    if (width <= 0 || height <= 0) return

    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    context.setTransform(dpr, 0, 0, dpr, 0, 0)
    context.clearRect(0, 0, width, height)
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'

    const scale = Math.min(width / frame.image.width, height / frame.image.height)
    const drawWidth = frame.image.width * scale
    const drawHeight = frame.image.height * scale

    context.drawImage(
      frame.image,
      (width - drawWidth) / 2,
      (height - drawHeight) / 2,
      drawWidth,
      drawHeight,
    )
  }, [frames, activeIndex, canvasSize])

  const loadPercent =
    loadState.total > 0 ? Math.round((loadState.loaded / loadState.total) * 100) : 0

  const progress = frames.length > 1 ? activeIndex / (frames.length - 1) : 0
  const isScrollTrack = status === 'ready' && !reducedMotion

  return (
    <section
      ref={sectionRef}
      aria-label="MedIntel capsule introduction"
      className={isScrollTrack ? 'relative h-[380vh]' : 'relative h-screen'}
    >
      <p className="sr-only">
        Scroll-driven animation of a medicine capsule opening, rotating, and closing again.
      </p>
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
        <CapsuleDotField
          reducedMotion={reducedMotion}
          className="pointer-events-none absolute inset-0 size-full"
        />
        <canvas ref={canvasRef} className="size-full" aria-hidden="true" />

        {status !== 'ready' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="max-w-md text-sm text-ink-muted">{statusCopy[status]}</p>
            {status === 'loading' && (
              <div
                className="h-1 w-48 overflow-hidden rounded-full bg-surface-muted"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={loadPercent}
                aria-label="Loading capsule frames"
              >
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-200"
                  style={{ width: `${loadPercent}%` }}
                />
              </div>
            )}
          </div>
        )}

        {status === 'ready' && (
          <div className="pointer-events-none absolute inset-0">
            {capsuleOverlaySpecs.map((spec) => {
              // Reduced motion skips the timeline: only the finale caption shows.
              const state = reducedMotion
                ? {
                    opacity: spec.id === 'close' ? 1 : 0,
                    rotationDeg: 0,
                    scale: 1,
                    translateY: 0,
                  }
                : computeCapsuleOverlayState(progress, spec.segment, spec.options)

              if (state.opacity <= 0.01) return null

              return (
                <div
                  key={spec.id}
                  aria-hidden={state.opacity < 0.05}
                  className={`absolute ${overlayPlacement[spec.id]}`}
                  style={{ opacity: state.opacity }}
                >
                  <p
                    className={`max-w-3xl text-center font-display font-bold leading-tight tracking-[-0.03em] drop-shadow-sm ${overlayTone[spec.id]}`}
                    style={{
                      transform: `translateY(${state.translateY}px) rotate(${state.rotationDeg}deg) scale(${state.scale})`,
                    }}
                  >
                    {spec.text}
                  </p>
                </div>
              )
            })}
          </div>
        )}

        {status === 'ready' && !reducedMotion && (
          <div
            className="pointer-events-none absolute bottom-8 flex flex-col items-center gap-1 text-ink-muted transition-opacity duration-500"
            style={{ opacity: activeIndex === 0 ? 1 : 0 }}
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.16em]">Scroll</span>
            <ChevronDown aria-hidden="true" className="size-4 animate-bounce" />
          </div>
        )}
      </div>
    </section>
  )
}
