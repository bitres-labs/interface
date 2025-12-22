import type { KeyboardEvent } from 'react'

export function blockInvalidNumberInput(event: KeyboardEvent<HTMLInputElement>) {
  if (event.key === '-' || event.key === '+' || event.key.toLowerCase() === 'e') {
    event.preventDefault()
  }
}
