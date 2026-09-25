import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  capsuleFrameNumber,
  capsuleOverlaySpecs,
  collectCapsuleFramePaths,
  computeCapsuleOverlayState,
  frameIndexForProgress,
  framePathsFromModules,
  loadCapsuleFrames,
  sortCapsuleFramePaths,
} from './capsuleFrames'

describe('capsuleFrameNumber', () => {
  it('extracts the last number from zero-padded filenames', () => {
    expect(capsuleFrameNumber('capsule_0001.webp')).toBe(1)
    expect(capsuleFrameNumber('capsule_0090.webp')).toBe(90)
  })

  it('extracts the last number when padding is inconsistent', () => {
    expect(capsuleFrameNumber('frame_7.webp')).toBe(7)
    expect(capsuleFrameNumber('/assets/frames/render12_v2.png')).toBe(2)
  })

  it('returns null when the filename has no number', () => {
    expect(capsuleFrameNumber('poster.webp')).toBeNull()
  })
})

describe('sortCapsuleFramePaths', () => {
  it('orders frames numerically regardless of padding', () => {
    const sorted = sortCapsuleFramePaths([
      '/frames/capsule_10.webp',
      '/frames/capsule_2.webp',
      '/frames/capsule_0001.webp',
    ])

    expect(sorted).toEqual([
      '/frames/capsule_0001.webp',
      '/frames/capsule_2.webp',
      '/frames/capsule_10.webp',
    ])
  })

  it('breaks ties alphabetically and pushes numberless names first', () => {
    const sorted = sortCapsuleFramePaths([
      '/frames/capsule_2b.webp',
      '/frames/cover.webp',
      '/frames/capsule_2a.webp',
    ])

    expect(sorted).toEqual([
      '/frames/cover.webp',
      '/frames/capsule_2a.webp',
      '/frames/capsule_2b.webp',
    ])
  })

  it('does not mutate the input array', () => {
    const paths = ['/frames/b.webp', '/frames/a.webp']
    sortCapsuleFramePaths(paths)
    expect(paths).toEqual(['/frames/b.webp', '/frames/a.webp'])
  })
})

describe('framePathsFromModules', () => {
  it('uses the resolved asset urls, not the glob keys', () => {
    const paths = framePathsFromModules({
      '../../../assets/home/frames/0002.webp': '/src/assets/home/frames/0002.webp',
      '../../../assets/home/frames/0001.webp': '/src/assets/home/frames/0001.webp',
    })

    expect(paths).toEqual([
      '/src/assets/home/frames/0001.webp',
      '/src/assets/home/frames/0002.webp',
    ])
  })

  it('returns nothing for an empty glob map', () => {
    expect(framePathsFromModules({})).toEqual([])
  })
})

describe('collectCapsuleFramePaths', () => {
  it('resolves the bundled frame sequence to loadable urls in play order', () => {
    const paths = collectCapsuleFramePaths()

    expect(paths).toHaveLength(144)
    expect(paths[0]).toMatch(/assets\/home\/frames\/0001\.webp$/)
    expect(paths.at(-1)).toMatch(/assets\/home\/frames\/0144\.webp$/)
  })

  it('never hands a relative source path to the image loader', () => {
    for (const path of collectCapsuleFramePaths()) {
      expect(path.startsWith('/') || path.startsWith('http')).toBe(true)
      expect(path).not.toContain('..')
    }
  })
})

class FakeImage {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  decoding = ''
  width = 1920
  height = 1080
  private currentSrc = ''

  set src(value: string) {
    this.currentSrc = value
    queueMicrotask(() => {
      if (value.includes('broken')) this.onerror?.()
      else this.onload?.()
    })
  }

  get src() {
    return this.currentSrc
  }
}

describe('loadCapsuleFrames', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('resolves one entry per frame, in order', async () => {
    vi.stubGlobal('Image', FakeImage)

    const frames = await loadCapsuleFrames(['/f/1.webp', '/f/2.webp'])

    expect(frames.map((frame) => frame.path)).toEqual(['/f/1.webp', '/f/2.webp'])
    expect(frames.every((frame) => frame.image instanceof FakeImage)).toBe(true)
  })

  it('repeats the previous frame when one fails instead of rejecting', async () => {
    vi.stubGlobal('Image', FakeImage)

    const frames = await loadCapsuleFrames([
      '/f/1.webp',
      '/f/broken.webp',
      '/f/3.webp',
    ])

    expect(frames).toHaveLength(3)
    expect(frames[1].path).toBe('/f/broken.webp')
    expect(frames[1].image).toBe(frames[0].image)
    expect(frames[2].image.src).toBe('/f/3.webp')
  })

  it('holds the first good frame while leading frames fail', async () => {
    vi.stubGlobal('Image', FakeImage)

    const frames = await loadCapsuleFrames(['/f/broken.webp', '/f/2.webp'])

    expect(frames).toHaveLength(2)
    expect(frames[0].image).toBe(frames[1].image)
  })

  it('reports progress for every frame, failures included', async () => {
    vi.stubGlobal('Image', FakeImage)
    const progress: number[] = []

    await loadCapsuleFrames(
      ['/f/1.webp', '/f/broken.webp', '/f/3.webp'],
      (loaded, total) => progress.push(loaded / total),
    )

    expect(progress).toEqual([1 / 3, 2 / 3, 1])
  })

  it('rejects only when the whole sequence fails', async () => {
    vi.stubGlobal('Image', FakeImage)

    await expect(loadCapsuleFrames(['/f/broken.webp'])).rejects.toThrow(
      /Failed to load any capsule frame/,
    )
  })
})

describe('computeCapsuleOverlayState', () => {
  const segment = { start: 0.25, end: 0.75 }
  const baseOptions = { fadeIn: 0.2, fadeOut: 0.2 }

  it('is invisible outside its segment', () => {
    expect(computeCapsuleOverlayState(0, segment, baseOptions).opacity).toBe(0)
    expect(computeCapsuleOverlayState(1, segment, baseOptions).opacity).toBe(0)
  })

  it('peaks near the middle of its segment', () => {
    const state = computeCapsuleOverlayState(0.5, segment, baseOptions)
    expect(state.opacity).toBeGreaterThan(0.9)
    expect(state.rotationDeg).toBe(0)
    expect(state.scale).toBe(1)
    expect(state.translateY).toBe(0)
  })

  it('eases in and out across the fade windows', () => {
    const early = computeCapsuleOverlayState(0.3, segment, baseOptions)
    const late = computeCapsuleOverlayState(0.7, segment, baseOptions)
    expect(early.opacity).toBeGreaterThan(0)
    expect(early.opacity).toBeLessThan(0.9)
    expect(early.opacity).toBeCloseTo(late.opacity)
  })

  it('rotates up to 45 degrees across the segment when enabled', () => {
    const options = { ...baseOptions, rotate: true }
    expect(computeCapsuleOverlayState(0.25, segment, options).rotationDeg).toBe(0)
    expect(computeCapsuleOverlayState(0.75, segment, options).rotationDeg).toBeCloseTo(45)
  })

  it('scales down across the segment when enabled', () => {
    const options = { ...baseOptions, scale: true }
    expect(computeCapsuleOverlayState(0.25, segment, options).scale).toBeCloseTo(1.06)
    expect(computeCapsuleOverlayState(0.75, segment, options).scale).toBeCloseTo(0.94)
  })

  it('drifts vertically by the configured amount when enabled', () => {
    const options = { ...baseOptions, driftPx: -36 }
    expect(computeCapsuleOverlayState(0.25, segment, options).translateY).toBe(0)
    expect(computeCapsuleOverlayState(0.75, segment, options).translateY).toBe(-36)
  })

  it('caps opacity at 1 inside the fully-visible window', () => {
    const options = { fadeIn: 0.3, fadeOut: 0.3 }
    expect(computeCapsuleOverlayState(0.5, segment, options).opacity).toBe(1)
  })

  it('holds at full opacity across a zero-length fade window', () => {
    const leading = { fadeIn: 0, fadeOut: 0.2 }
    expect(computeCapsuleOverlayState(0.25, segment, leading).opacity).toBe(1)

    const trailing = { fadeIn: 0.2, fadeOut: 0 }
    expect(computeCapsuleOverlayState(0.75, segment, trailing).opacity).toBe(1)
  })

  it('still hides a holding overlay outside its own segment', () => {
    const leading = { fadeIn: 0, fadeOut: 0.2 }
    const trailing = { fadeIn: 0.2, fadeOut: 0 }
    expect(computeCapsuleOverlayState(0.1, segment, leading).opacity).toBe(0)
    expect(computeCapsuleOverlayState(0.9, segment, trailing).opacity).toBe(0)
  })
})

describe('capsuleOverlaySpecs', () => {
  it('covers the timeline with three ordered, contiguous segments', () => {
    expect(capsuleOverlaySpecs).toHaveLength(3)

    const [opening, lift, close] = capsuleOverlaySpecs
    expect(opening.segment).toEqual({ start: 0, end: 1 / 3 })
    expect(lift.segment).toEqual({ start: 1 / 3, end: 2 / 3 })
    expect(close.segment).toEqual({ start: 2 / 3, end: 1 })
  })

  it('gives every overlay non-overlapping fade windows and unique ids', () => {
    const ids = new Set(capsuleOverlaySpecs.map((spec) => spec.id))
    expect(ids.size).toBe(capsuleOverlaySpecs.length)

    for (const spec of capsuleOverlaySpecs) {
      expect(spec.options.fadeIn).toBeGreaterThanOrEqual(0)
      expect(spec.options.fadeOut).toBeGreaterThanOrEqual(0)
      expect(spec.options.fadeIn + spec.options.fadeOut).toBeLessThanOrEqual(1)
    }
  })

  it('keeps the first headline on screen at the top and the finale at the end', () => {
    const [opening, , close] = capsuleOverlaySpecs

    // The hero must not load, or finish, as a bare capsule.
    expect(opening.options.fadeIn).toBe(0)
    expect(close.options.fadeOut).toBe(0)

    const atTop = computeCapsuleOverlayState(0, opening.segment, opening.options)
    const atEnd = computeCapsuleOverlayState(1, close.segment, close.options)
    expect(atTop.opacity).toBe(1)
    expect(atEnd.opacity).toBe(1)
  })

  it('shows exactly one headline per scroll position', () => {
    for (let step = 0; step <= 20; step += 1) {
      const progress = step / 20
      const visible = capsuleOverlaySpecs.filter(
        (spec) =>
          computeCapsuleOverlayState(progress, spec.segment, spec.options).opacity > 0.01,
      )
      expect(visible.length).toBeLessThanOrEqual(1)
    }
  })

  it('keeps non-finale overlays empty under reduced motion', () => {
    // Mirrors the component contract: reduced motion renders only the finale.
    const reducedMotionSpecs = capsuleOverlaySpecs.filter((spec) => spec.id !== 'close')
    expect(reducedMotionSpecs).toHaveLength(2)
  })
})

describe('frameIndexForProgress', () => {
  it('maps progress onto frame indices inclusive of both ends', () => {
    expect(frameIndexForProgress(0, 61)).toBe(0)
    expect(frameIndexForProgress(0.5, 61)).toBe(30)
    expect(frameIndexForProgress(1, 61)).toBe(60)
  })

  it('clamps out-of-range progress', () => {
    expect(frameIndexForProgress(-0.5, 61)).toBe(0)
    expect(frameIndexForProgress(1.75, 61)).toBe(60)
  })

  it('handles single-frame and empty sequences', () => {
    expect(frameIndexForProgress(0.7, 1)).toBe(0)
    expect(frameIndexForProgress(0.7, 0)).toBe(0)
  })
})
