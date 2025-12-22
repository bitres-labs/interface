import { describe, it, expect, vi } from 'vitest'
import { blockInvalidNumberInput } from './input'

describe('input utilities', () => {
  describe('blockInvalidNumberInput', () => {
    it('should prevent minus sign input', () => {
      const event = {
        key: '-',
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent<HTMLInputElement>

      blockInvalidNumberInput(event)

      expect(event.preventDefault).toHaveBeenCalled()
    })

    it('should prevent plus sign input', () => {
      const event = {
        key: '+',
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent<HTMLInputElement>

      blockInvalidNumberInput(event)

      expect(event.preventDefault).toHaveBeenCalled()
    })

    it('should prevent "e" input (lowercase)', () => {
      const event = {
        key: 'e',
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent<HTMLInputElement>

      blockInvalidNumberInput(event)

      expect(event.preventDefault).toHaveBeenCalled()
    })

    it('should prevent "E" input (uppercase)', () => {
      const event = {
        key: 'E',
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent<HTMLInputElement>

      blockInvalidNumberInput(event)

      expect(event.preventDefault).toHaveBeenCalled()
    })

    it('should allow digit input', () => {
      const event = {
        key: '5',
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent<HTMLInputElement>

      blockInvalidNumberInput(event)

      expect(event.preventDefault).not.toHaveBeenCalled()
    })

    it('should allow decimal point input', () => {
      const event = {
        key: '.',
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent<HTMLInputElement>

      blockInvalidNumberInput(event)

      expect(event.preventDefault).not.toHaveBeenCalled()
    })

    it('should allow Backspace', () => {
      const event = {
        key: 'Backspace',
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent<HTMLInputElement>

      blockInvalidNumberInput(event)

      expect(event.preventDefault).not.toHaveBeenCalled()
    })

    it('should allow Tab', () => {
      const event = {
        key: 'Tab',
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent<HTMLInputElement>

      blockInvalidNumberInput(event)

      expect(event.preventDefault).not.toHaveBeenCalled()
    })
  })
})
