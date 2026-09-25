export type FrameModuleMap = Record<string, string>

// URLs only (no image bytes) — resolved at build/dev time by Vite.
// The pattern must be an inline literal: Vite parses this call statically.
const frameModules = import.meta.glob('../../../assets/home/frames/*.{webp,png}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as FrameModuleMap

const LAST_NUMBER_PATTERN = /(\d+)(?!.*\d)/

/** Returns the number used to order a frame path, or null when it has none. */
export function capsuleFrameNumber(path: string): number | null {
  const match = path.match(LAST_NUMBER_PATTERN)
  return match ? Number(match[1]) : null
}

/** Orders frame paths by their trailing number so padding is optional. */
export function sortCapsuleFramePaths(paths: string[]): string[] {
  return [...paths].sort((a, b) => {
    const aNumber = capsuleFrameNumber(a)
    const bNumber = capsuleFrameNumber(b)

    if (aNumber === null && bNumber === null) return a.localeCompare(b)
    if (aNumber === null) return -1
    if (bNumber === null) return 1
    return aNumber - bNumber || a.localeCompare(b)
  })
}

/**
 * Maps scroll progress (0–1) onto a frame index, hitting the first frame at 0
 * and the last frame at 1.
 */
export function frameIndexForProgress(progress: number, frameCount: number): number {
  if (frameCount <= 1) return 0
  const clamped = Math.min(Math.max(progress, 0), 1)
  return Math.round(clamped * (frameCount - 1))
}

/**
 * Pulls the resolved asset URLs out of a glob map, in play order.
 *
 * The map's *keys* are importer-relative source paths ('../../../assets/…')
 * and the *values* are the URLs Vite emits. Only the values can be used as an
 * image source — the keys resolve relative to the current page and 404.
 */
export function framePathsFromModules(modules: FrameModuleMap): string[] {
  return sortCapsuleFramePaths(Object.values(modules))
}

/** Frame source URLs collected from src/assets/home/frames, in play order. */
export function collectCapsuleFramePaths(): string[] {
  return framePathsFromModules(frameModules)
}

export interface LoadedCapsuleFrame {
  path: string
  image: HTMLImageElement
}

function preloadImage(path: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`Failed to load capsule frame: ${path}`))
    image.src = path
  })
}

/**
 * Preloads every frame, reporting cumulative progress as images settle.
 *
 * A frame that fails to load repeats its predecessor rather than rejecting the
 * whole batch, so one bad request degrades into a brief freeze instead of
 * blanking the hero. Only an entirely failed sequence throws.
 */
export async function loadCapsuleFrames(
  paths: string[],
  onProgress?: (loaded: number, total: number) => void,
): Promise<LoadedCapsuleFrame[]> {
  let settled = 0

  const results = await Promise.allSettled(
    paths.map(async (path) => {
      try {
        return await preloadImage(path)
      } finally {
        settled += 1
        onProgress?.(settled, paths.length)
      }
    }),
  )

  const images = results.map((result) =>
    result.status === 'fulfilled' ? result.value : null,
  )

  const firstLoaded = images.findIndex((image) => image !== null)
  if (firstLoaded === -1) {
    throw new Error('Failed to load any capsule frame')
  }

  let previous = images[firstLoaded] as HTMLImageElement
  return images.map((image, index) => {
    if (image) previous = image
    return { path: paths[index], image: previous }
  })
}

// --- Scroll overlay timeline -------------------------------------------------
// The Blender animation has three transitions spread evenly across the frame
// sequence: open (frames 1–48), lift & rotate 45° (frames 48–96), and close
// (frames 96–144). Overlays are expressed as fractions of the timeline so the
// staging survives frame-count changes.

export interface CapsuleOverlaySegment {
  start: number
  end: number
}

export interface CapsuleOverlayOptions {
  /**
   * Fractions of the segment spent fading in/out. Pass 0 to hold the overlay at
   * full opacity across that edge instead of ramping — used by the opening
   * headline so it is already on screen on first paint, and by the finale so the
   * hero does not end on an empty frame.
   */
  fadeIn: number
  fadeOut: number
  rotate?: boolean
  scale?: boolean
  /** Vertical drift in px across the segment (negative rises). */
  driftPx?: number
}

export interface CapsuleOverlayState {
  opacity: number
  rotationDeg: number
  scale: number
  translateY: number
}

export interface CapsuleOverlaySpec {
  id: 'opening' | 'lift' | 'close'
  text: string
  segment: CapsuleOverlaySegment
  options: CapsuleOverlayOptions
}

function smoothstep(value: number) {
  const clamped = Math.min(Math.max(value, 0), 1)
  return clamped * clamped * (3 - 2 * clamped)
}

/** Ramps over a fraction of the segment; a zero-length window holds at full. */
function fadeWindow(value: number, span: number) {
  return span <= 0 ? 1 : smoothstep(value / span)
}

/** Computes opacity/rotation/scale for an overlay at a timeline position. */
export function computeCapsuleOverlayState(
  progress: number,
  segment: CapsuleOverlaySegment,
  options: CapsuleOverlayOptions,
): CapsuleOverlayState {
  const span = Math.max(segment.end - segment.start, Number.EPSILON)
  const local = Math.min(Math.max((progress - segment.start) / span, 0), 1)
  const outside = progress < segment.start || progress > segment.end

  return {
    // Outside its own segment an overlay is always hidden, even when it holds
    // its opacity at an edge.
    opacity: outside
      ? 0
      : Math.min(
          fadeWindow(local, options.fadeIn),
          fadeWindow(1 - local, options.fadeOut),
        ),
    rotationDeg: options.rotate ? local * 45 : 0,
    scale: options.scale ? 1.06 - 0.12 * local : 1,
    translateY: options.driftPx ? options.driftPx * local || 0 : 0,
  }
}

/** The three scroll-driven headlines, one per capsule transition. */
export const capsuleOverlaySpecs: CapsuleOverlaySpec[] = [
  {
    id: 'opening',
    text: 'Clinical intelligence, unified.',
    segment: { start: 0, end: 1 / 3 },
    options: { fadeIn: 0, fadeOut: 0.12 },
  },
  {
    id: 'lift',
    text: 'From data to decisions.',
    segment: { start: 1 / 3, end: 2 / 3 },
    options: { fadeIn: 0.25, fadeOut: 0.15 },
  },
  {
    id: 'close',
    text: 'Meet MedIntel.',
    segment: { start: 2 / 3, end: 1 },
    options: { fadeIn: 0.2, fadeOut: 0 },
  },
]
