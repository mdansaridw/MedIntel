import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CohortRadarChart, wrapLabel } from './CohortRadarChart'
import type { CohortRadar } from '../types'

const radar: CohortRadar = {
  axes: [
    { key: 'a', label: 'Osteoarthritis', cohortName: 'Osteoarthritis (disorder)', cohortCode: '1', patientCount: 8, prevalence: 57.1, spread: 26.7 },
    { key: 'b', label: 'Anemia', cohortName: 'Anemia (disorder)', cohortCode: '2', patientCount: 7, prevalence: 50, spread: 100 },
    { key: 'c', label: 'Metabolic syndrome X', cohortName: 'Metabolic syndrome X (disorder)', cohortCode: '3', patientCount: 6, prevalence: 42.9, spread: 100 },
    { key: 'd', label: 'Essential hypertension', cohortName: 'Essential hypertension (disorder)', cohortCode: '4', patientCount: 5, prevalence: 35.7, spread: 100 },
  ],
  series: [
    { key: 'population', label: 'All patients', color: '#579ad9', size: 14, values: [57.1, 50, 42.9, 35.7] },
    { key: 'diabetes', label: 'Diabetes / prediabetes', color: '#c084fc', size: 3, values: [33.3, 100, 66.7, 0] },
    { key: 'hypertension', label: 'Hypertension', color: '#34d399', size: 5, values: [60, 80, 0, 100] },
    { key: 'burden', label: 'High care burden (10+ conditions)', color: '#f0a132', size: 2, values: [50, 100, 100, 0] },
  ],
}

const SIZE = 420

let observers: ResizeObserverCallback[] = []

/** jsdom has no ResizeObserver and no layout, so both are supplied by the test. */
function stubResizeObserver() {
  observers = []
  vi.stubGlobal(
    'ResizeObserver',
    class {
      private readonly callback: ResizeObserverCallback
      constructor(callback: ResizeObserverCallback) {
        this.callback = callback
        observers.push(callback)
      }
      observe(el: Element) {
        this.callback(
          [{ contentRect: el.getBoundingClientRect() } as unknown as ResizeObserverEntry],
          this as unknown as ResizeObserver,
        )
      }
      unobserve() {}
      disconnect() {}
    },
  )
}

/** Mimics the browser reporting a new panel width after the chart has already mounted. */
function fireResize(width: number) {
  const entry = { contentRect: { width, height: width } } as unknown as ResizeObserverEntry
  act(() => {
    for (const callback of observers) callback([entry], {} as ResizeObserver)
  })
}

function renderChart(data: CohortRadar = radar) {
  return render(<CohortRadarChart radar={data} />)
}

/** The legend row for one group, so a percentage can be asserted in the right column. */
const legendRow = (label: RegExp) => screen.getByRole('button', { name: label })

beforeEach(() => {
  stubResizeObserver()
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    width: SIZE,
    height: SIZE,
  } as DOMRect)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('wrapLabel', () => {
  it('leaves a short name on one line', () => {
    expect(wrapLabel('Anemia')).toEqual(['Anemia'])
  })

  it('splits a long name on a space rather than mid-word', () => {
    expect(wrapLabel('Essential hypertension')).toEqual(['Essential', 'hypertension'])
  })

  it('never returns more than two lines', () => {
    const lines = wrapLabel('Acute non-ST segment elevation myocardial infarction')
    expect(lines).toHaveLength(2)
    expect(lines[1].endsWith('…')).toBe(true)
  })
})

describe('CohortRadarChart', () => {
  it('renders one polygon per patient group', () => {
    const { container } = renderChart()
    // Rings, spokes, data polygons and hover targets are all <polygon>; the data series are
    // the only ones carrying a fill, so they are counted by the four series keys.
    const fills = container.querySelectorAll('polygon[fill]:not([fill="none"]):not([fill="transparent"])')
    expect(fills).toHaveLength(radar.series.length)
  })

  it('sizes the viewBox to the measured width so nothing is scaled', () => {
    // A 420-unit viewBox drawn into 420px keeps font sizes and gaps at their stated values.
    const { container } = renderChart()
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('viewBox')).toBe(`0 0 ${SIZE} ${SIZE}`)
    expect(svg.getAttribute('width')).toBe(String(SIZE))
  })

  it('redraws at the new width when the panel is resized', () => {
    const { container } = renderChart()
    fireResize(600)
    expect(container.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 600 600')
    fireResize(260)
    expect(container.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 260 260')
  })

  it('labels every spoke with the trimmed disease name', () => {
    renderChart()
    for (const label of ['Osteoarthritis', 'Anemia', 'Essential', 'hypertension']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
    // The SNOMED tag is not shown on the rim; the full name stays in the tooltip and table.
    expect(screen.queryByText('Anemia (disorder)')).toBeInTheDocument()
    expect(screen.queryByText(/Anemia \(disorder\)$/)).toBeInTheDocument()
  })

  it('gives screen readers the full prevalence table', () => {
    renderChart()
    const table = screen.getByRole('table', { hidden: true })
    const header = within(table).getAllByRole('columnheader').map((c) => c.textContent)
    expect(header[0]).toBe('Disease cohort')
    expect(header).toContain('Diabetes / prediabetes (3 patients)')
    expect(within(table).getByRole('rowheader', { name: 'Anemia (disorder)' })).toBeInTheDocument()
  })

  it('lists every group with its real patient count', () => {
    renderChart()
    expect(screen.getByText('14 patients')).toBeInTheDocument()
    expect(screen.getByText('3 patients')).toBeInTheDocument()
    expect(screen.getByText('2 patients')).toBeInTheDocument()
  })

  it('keeps the chart and the legend in separate grid columns that can shrink', () => {
    const { container } = renderChart()
    const grid = container.firstElementChild!
    expect(grid.className).toContain('grid')
    // min-w-0 on both tracks is what stops a wide SVG forcing the grid wider than the card.
    expect(grid.querySelectorAll('.min-w-0').length).toBeGreaterThanOrEqual(2)
  })

  it('shows each group its own percentage on the hovered spoke', () => {
    const { container } = renderChart()
    // Spoke index 1 is "Anemia": 7 of 14, 3 of 3, 4 of 5, 2 of 2.
    fireEvent.mouseOver(container.querySelectorAll('line[stroke="transparent"]')[1]!)
    expect(legendRow(/All patients/)).toHaveTextContent('14 patients · 50.0%')
    expect(legendRow(/Diabetes/)).toHaveTextContent('3 patients · 100.0%')
    expect(legendRow(/^Hypertension/)).toHaveTextContent('5 patients · 80.0%')
    expect(legendRow(/High care burden/)).toHaveTextContent('2 patients · 100.0%')
  })

  it('hides the per-spoke percentage again when no spoke is hovered', () => {
    const { container } = renderChart()
    fireEvent.mouseOver(container.querySelectorAll('line[stroke="transparent"]')[1]!)
    expect(legendRow(/All patients/)).toHaveTextContent('14 patients · 50.0%')
    fireEvent.mouseLeave(container.firstElementChild!)
    expect(legendRow(/All patients/)).toHaveTextContent('14 patients')
  })

  it('reports the hovered cohort size and population prevalence together', () => {
    const { container } = renderChart()
    fireEvent.mouseOver(container.querySelectorAll('line[stroke="transparent"]')[1]!)
    expect(
      screen.getByText('7 of the population carry this diagnosis (50.0%)'),
    ).toBeInTheDocument()
  })

  it('clears the spoke readout when the pointer leaves the chart', () => {
    const { container } = renderChart()
    fireEvent.mouseOver(container.querySelectorAll('line[stroke="transparent"]')[1]!)
    fireEvent.mouseLeave(container.firstElementChild!)
    expect(screen.queryByText(/of the population carry this diagnosis/)).not.toBeInTheDocument()
  })

  it('marks the isolated group as pressed, for pointer and keyboard alike', () => {
    renderChart()
    const trigger = screen.getByRole('button', { name: /Hypertension/ })
    fireEvent.mouseOver(trigger)
    expect(trigger).toHaveAttribute('aria-pressed', 'true')
    fireEvent.mouseLeave(trigger)
    expect(trigger).toHaveAttribute('aria-pressed', 'false')
    fireEvent.focus(trigger)
    expect(trigger).toHaveAttribute('aria-pressed', 'true')
    fireEvent.blur(trigger)
    expect(trigger).toHaveAttribute('aria-pressed', 'false')
  })

  it('isolates a polygon when its own outline is hovered', () => {
    const { container } = renderChart()
    const outlines = container.querySelectorAll('polygon[fill="transparent"]')
    expect(outlines).toHaveLength(radar.series.length)
    // The baseline is painted last so it stays readable, which puts the first hit target
    // on the high-burden group.
    fireEvent.mouseOver(outlines[0]!)
    expect(legendRow(/High care burden/)).toHaveAttribute('aria-pressed', 'true')
  })

  it('explains the spoke selection when nothing is hovered', () => {
    renderChart()
    expect(screen.getByText(/best separate these groups/)).toBeInTheDocument()
  })

  it('refuses to draw a radar from fewer than three spokes', () => {
    renderChart({ ...radar, axes: radar.axes.slice(0, 2) })
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText(/Not enough comparable disease cohorts/)).toBeInTheDocument()
    // The empty state is an explanation, not a blank card.
    expect(screen.getByText(/no distribution is drawn rather than a misleading one/)).toBeInTheDocument()
  })

  it('draws nothing at all for an empty radar', () => {
    const { container } = renderChart({ axes: [], series: [] })
    expect(container.querySelector('svg')).toBeNull()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.queryByRole('table', { hidden: true })).not.toBeInTheDocument()
  })
})
