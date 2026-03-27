const MIN_LENGTH = 12
const MAX_LENGTH = 2048

interface Props {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  isLoading: boolean
  cooldownSeconds: number
}

export function InterestForm({ value, onChange, onSubmit, isLoading, cooldownSeconds }: Props) {
  const tooShort = value.length > 0 && value.length < MIN_LENGTH
  const disabled = isLoading || cooldownSeconds > 0 || tooShort || value.length === 0

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (!disabled) onSubmit() }}
    >
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={MAX_LENGTH}
        rows={4}
        placeholder="Describe your interests… (e.g. I love artificial intelligence and music)"
      />
      {tooShort && <p>Please enter at least {MIN_LENGTH} characters.</p>}
      <p>{value.length} / {MAX_LENGTH}</p>
      <button type="submit" disabled={disabled}>
        {isLoading
          ? 'Searching…'
          : cooldownSeconds > 0
            ? `Please wait ${cooldownSeconds}s`
            : 'Find Topics'}
      </button>
    </form>
  )
}
