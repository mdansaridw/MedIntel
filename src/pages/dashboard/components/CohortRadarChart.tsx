import { useEffect, useRef, useState } from 'react'
import type { CohortRadar, RadarSeries } from '../types'

/** Ring positions, outermost last. Three rings read as a scale without cluttering the web. */
const RINGS = [0.25, 0.5, 0.75, 1]

/**
 * Space reserved between the outer ring and the SVG edge for the rim labels.
 * 92px holds the longest two-line disease name at 10.5px.
 */
const RIM = 92

const MIN_RADIUS = 70
const FALLBACK_WIDTH = 460
const LABEL_LINE_H = 12.5
const MAX_LABEL_LINE = 13
const MAX_LABEL_LINES = 2

/**
 * Measures the panel's own width so the SVG viewBox can be exactly square and match it.
 *
 * A fixed viewBox would scale every dimension inside it to fit the element: labels set at
 * 10.5 units would render at whatever the ratio happens to be. Sizing the viewBox to the
 * measured width keeps one SVG unit equal to one CSS pixel, so the geometry below means
 * what it says at every viewport.
 */
function useMeasuredWidth(fallback: number) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState<number | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width ?? 0
      setWidth((prev) => (prev === null || Math.abs(prev - next) > 0.5 ? next : prev))
    })

    // Read first: an unlaid-out 0 must not clobber whatever the observer reports.
    const initial = el.getBoundingClientRect().width
    if (initial > 0) setWidth(initial)
    observer.observe(el)

    return () => observer.disconnect()
  }, [])

  return { ref, width: width && width > 0 ? width : fallback }
}

/** Splits a disease name into at most two short lines. Ellipsis-truncating the rim label would hide which disease the spoke is, which is the one thing the chart must convey. */
export function wrapLabel(label: string): string[] {
  const words = label.split(' ').filter(Boolean)
  if (words.length === 0) return ['']
  if (label.length <= MAX_LABEL_LINE) return [label]

  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (candidate.length > MAX_LABEL_LINE && current) {
      lines.push(current)
      current = word
    } else {
      current = candidate
    }
  }
  if (current) lines.push(current)

  if (lines.length <= MAX_LABEL_LINES) return lines

  // Still too long: keep the first line whole and ellipsis the rest.
  return [lines[0], `${lines.slice(1).join(' ').slice(0, MAX_LABEL_LINE - 1)}…`]
}

const fmt = (value: number) => `${value.toFixed(1)}%`

interface Hover {
  series: string | null
  axis: number | null
}

const NO_HOVER: Hover = { series: null, axis: null }

export function CohortRadarChart({ radar }: { radar: CohortRadar }) {
  const { axes, series } = radar
  const { ref, width } = useMeasuredWidth(FALLBACK_WIDTH)
  const [hover, setHover] = useState<Hover>(NO_HOVER)

  // A data refresh can leave a stale hover pointing at a spoke that no longer exists.
  useEffect(() => {
    setHover((prev) => (prev.axis !== null && prev.axis >= axes.length ? NO_HOVER : prev))
  }, [axes.length])

  if (axes.length < 3) {
    return (
      <div
        ref={ref}
        className="flex min-w-0 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line px-6 py-16 text-center"
      >
        <p className="text-sm font-medium text-ink">Not enough comparable disease cohorts</p>
        <p className="max-w-md text-xs text-ink-muted">
          A radar needs at least three cohorts that the graph can distinguish between patient
          groups. None qualified here, so no distribution is drawn rather than a misleading one.
        </p>
      </div>
    )
  }

  const size = Math.round(width)
  const cx = size / 2
  const cy = size / 2
  const radius = Math.max(MIN_RADIUS, size / 2 - RIM)
  const count = axes.length

  /** Spoke i, starting at 12 o'clock and running clockwise. */
  const angleOf = (index: number) => -Math.PI / 2 + (2 * Math.PI * index) / count
  const pointAt = (index: number, fraction: number) => {
    const angle = angleOf(index)
    return [cx + Math.cos(angle) * radius * fraction, cy + Math.sin(angle) * radius * fraction] as const
  }

  const polygonPoints = (s: RadarSeries) =>
    s.values
      .map((value, index) => pointAt(index, Math.max(0, Math.min(1, value / 100))).join(','))
      .join(' ')

  // Painting the baseline last keeps the population outline readable on top of the subgroups.
  const paintOrder = [...series].reverse()
  const hoveredAxis = hover.axis !== null ? axes[hover.axis] : null

  return (
    <div
      className="grid min-w-0 grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]"
      onMouseLeave={() => setHover(NO_HOVER)}
    >
      <div ref={ref} className="min-w-0">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          width={size}
          height={size}
          className="block max-w-full"
          role="img"
          aria-label={`Cohort disease distribution across ${series.length} patient groups, comparing ${count} disease cohorts.`}
        >
          <title>
            {`Cohort disease distribution — ${count} disease cohorts across ${series.length} patient groups`}
          </title>

          {/* Rings, then spokes, so both stay under the data polygons. */}
          {RINGS.map((ring) => (
            <polygon
              key={ring}
              points={axes
                .map((_, index) => pointAt(index, ring).join(','))
                .join(' ')}
              fill="none"
              stroke="var(--line)"
              strokeWidth={ring === 1 ? 1.25 : 1}
            />
          ))}
          {axes.map((axis, index) => (
            <line
              key={`spoke-${axis.key}`}
              x1={cx}
              y1={cy}
              x2={pointAt(index, 1)[0]}
              y2={pointAt(index, 1)[1]}
              stroke="var(--line)"
              strokeWidth={1}
            />
          ))}

          {/* Ring scale, offset from the 12 o'clock spoke so it never sits on a data line. */}
          {RINGS.map((ring) => (
            <text
              key={`ring-label-${ring}`}
              x={cx + 5}
              y={cy - radius * ring + 3.5}
              className="numeric"
              fontSize={9}
              fill="var(--ink-muted)"
            >
              {ring * 100}
            </text>
          ))}

          {paintOrder.map((s) => {
            const dimmed = hover.series !== null && hover.series !== s.key
            return (
              <g key={s.key}>
                <polygon
                  points={polygonPoints(s)}
                  fill={s.color}
                  fillOpacity={dimmed ? 0.05 : 0.14}
                  stroke={s.color}
                  strokeWidth={hover.series === s.key ? 2.5 : 1.75}
                  strokeOpacity={dimmed ? 0.3 : 1}
                  strokeLinejoin="round"
                />
                {s.values.map((value, index) => {
                  const [x, y] = pointAt(index, Math.max(0, Math.min(1, value / 100)))
                  return (
                    <circle
                      key={`${s.key}-${index}`}
                      cx={x}
                      cy={y}
                      r={hover.series === s.key ? 3.5 : 2.5}
                      fill={s.color}
                      fillOpacity={dimmed ? 0.3 : 1}
                    />
                  )
                })}
              </g>
            )
          })}

          {/* Spoke hit areas sit above the polygons so hovering a spoke always registers. */}
          {axes.map((axis, index) => {
            const [x, y] = pointAt(index, 1)
            const cos = Math.cos(angleOf(index))
            const labelX = cx + cos * (radius + 14)
            const labelY = cy + Math.sin(angleOf(index)) * (radius + 14)
            const selected = hover.axis === index
            const lines = wrapLabel(axis.label)
            // Centre the block of lines on the spoke's rim point.
            const firstDy = -((lines.length - 1) * LABEL_LINE_H) / 2
            return (
              <g key={`hit-${axis.key}`}>
                <line
                  x1={cx}
                  y1={cy}
                  x2={x}
                  y2={y}
                  stroke="transparent"
                  strokeWidth={14}
                  onMouseEnter={() => setHover((prev) => ({ ...prev, axis: index }))}
                />
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor={cos > 0.2 ? 'start' : cos < -0.2 ? 'end' : 'middle'}
                  dominantBaseline="middle"
                  fontSize={10.5}
                  fontWeight={selected ? 700 : 500}
                  fill={selected ? 'var(--ink)' : 'var(--ink-muted)'}
                >
                  <title>{`${axis.cohortName} — ${axis.patientCount} patients (${fmt(axis.prevalence)} of all patients)`}</title>
                  {lines.map((line, lineIndex) => (
                    <tspan key={line} x={labelX} dy={lineIndex === 0 ? firstDy : LABEL_LINE_H}>
                      {line}
                    </tspan>
                  ))}
                </text>
              </g>
            )
          })}

          {/* Wide transparent wedges make the polygons themselves hoverable. */}
          {paintOrder.map((s) => (
            <polygon
              key={`pick-${s.key}`}
              points={polygonPoints(s)}
              fill="transparent"
              stroke="transparent"
              strokeWidth={10}
              onMouseEnter={() => setHover((prev) => ({ ...prev, series: s.key }))}
            />
          ))}
        </svg>
      </div>

      <aside className="flex min-w-0 flex-col gap-4">
        <div>
          <h3 className="text-sm font-semibold text-ink"></h3>
          <p className="mt-1 text-xs text-ink-muted">
          </p>
        </div>

        <ul className="flex flex-col gap-1.5">
          {series.map((s) => {
            const selected = hover.series === s.key
            const value = hover.axis === null ? null : s.values[hover.axis]
            return (
              <li key={s.key}>
                <button
                  type="button"
                  onMouseEnter={() => setHover((prev) => ({ ...prev, series: s.key }))}
                  onFocus={() => setHover((prev) => ({ ...prev, series: s.key }))}
                  onBlur={() => setHover((prev) => ({ ...prev, series: null }))}
                  aria-pressed={selected}
                  className={`flex w-full min-w-0 items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors ${
                    selected
                      ? 'border-accent/50 bg-accent-soft'
                      : 'border-transparent hover:border-line hover:bg-surface-raised'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="size-3 shrink-0 rounded-sm"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-ink">{s.label}</span>
                    <span className="numeric block text-[11px] text-ink-muted">
                      {s.size} {s.size === 1 ? 'patient' : 'patients'}
                      {value !== null && ` · ${fmt(value)}`}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>

        {hoveredAxis ? (
          <div className="rounded-xl border border-line bg-surface-raised px-3 py-2.5">
            <p className="text-xs font-semibold text-ink">{hoveredAxis.cohortName}</p>
            <p className="numeric mt-1 text-[11px] text-ink-muted">
              {hoveredAxis.patientCount} of the population carry this diagnosis ({fmt(hoveredAxis.prevalence)})
            </p>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-line px-3 py-2.5 text-[11px] leading-relaxed text-ink-muted">
            Spokes are the disease cohorts that best separate these groups — ranked by the widest
            gap in prevalence between any two. Every patient with the diagnosis appears in the
            cohort count, and groups are drawn from each patient&rsquo;s own conditions and
            readings.
          </p>
        )}

        <p className="text-[11px] text-ink-muted">
          <span className="numeric">0</span> to <span className="numeric">100</span> per cent of
          each group. Cohorts that no patient&rsquo;s condition list carries (social and
          administrative findings) are excluded, so their prevalence is not shown as zero.
        </p>
      </aside>

      {/* Screen readers get the numbers, which overlapping polygons cannot convey. */}
      <table className="sr-only">
        <caption>Percentage of each patient group carrying each disease cohort</caption>
        <thead>
          <tr>
            <th scope="col">Disease cohort</th>
            {series.map((s) => (
              <th key={s.key} scope="col">
                {s.label} ({s.size} patients)
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {axes.map((axis, index) => (
            <tr key={axis.key}>
              <th scope="row">{axis.cohortName}</th>
              {series.map((s) => (
                <td key={s.key}>{fmt(s.values[index] ?? 0)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
