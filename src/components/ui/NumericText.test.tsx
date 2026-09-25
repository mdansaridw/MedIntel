import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { NumericText } from './NumericText'

describe('NumericText', () => {
  it('renders every numeric sequence with the numeric font class', () => {
    const { container } = render(<NumericText text="Patient001 has HbA1c 6.4%" />)
    const numericParts = [...container.querySelectorAll('.numeric')].map((part) => part.textContent)

    expect(numericParts).toEqual(['001', '1', '6.4'])
  })
})
