import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { post } from '../services/apiClient'
import type { InterestSearchRequestDto, InterestSearchResponseDto } from '../types/api'
import { InterestForm } from '../components/InterestForm'
import { InterestResults } from '../components/InterestResults'

const COOLDOWN_SECONDS = 60
const COOLDOWN_KEY = 'interestSearch_cooldownUntil'

function getRemainingCooldown(): number {
  const until = Number(localStorage.getItem(COOLDOWN_KEY) ?? 0)
  return Math.max(0, Math.ceil((until - Date.now()) / 1000))
}

export default function InterestSearchView() {
  const [text, setText] = useState('')
  const [cooldown, setCooldown] = useState(getRemainingCooldown)

  // Tick cooldown down every second
  useEffect(() => {
    if (cooldown <= 0) return
    const id = setInterval(() => {
      const remaining = getRemainingCooldown()
      setCooldown(remaining)
      if (remaining <= 0) clearInterval(id)
    }, 1000)
    return () => clearInterval(id)
  }, [cooldown])

  const mutation = useMutation({
    mutationFn: (req: InterestSearchRequestDto) =>
      post<InterestSearchResponseDto>('/api/v1/topics/interest-search', req),
    onSuccess: () => {
      const until = Date.now() + COOLDOWN_SECONDS * 1000
      localStorage.setItem(COOLDOWN_KEY, String(until))
      setCooldown(COOLDOWN_SECONDS)
    },
  })

  const handleSubmit = () => {
    mutation.mutate({ interestsText: text })
  }

  return (
    <div>
      <h1>Find Topics by Interest</h1>
      <InterestForm
        value={text}
        onChange={setText}
        onSubmit={handleSubmit}
        isLoading={mutation.isPending}
        cooldownSeconds={cooldown}
      />
      {mutation.isError && <p>Something went wrong. Please try again.</p>}
      {mutation.data && <InterestResults data={mutation.data} />}
    </div>
  )
}
