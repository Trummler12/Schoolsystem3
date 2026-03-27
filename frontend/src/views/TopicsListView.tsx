import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { get } from '../services/apiClient'
import type { TopicListResponse } from '../types/api'
import { TopicCard } from '../components/TopicCard'

export default function TopicsListView() {
  const [maxLayer, setMaxLayer] = useState(3)
  const [showCourses, setShowCourses] = useState(true)
  const [showAchievements, setShowAchievements] = useState(true)

  const params: Record<string, string> = {
    maxLayer: String(maxLayer),
    showCourses: String(showCourses),
    showAchievements: String(showAchievements),
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['topics', params],
    queryFn: () => get<TopicListResponse>('/api/v1/topics', params),
  })

  return (
    <div>
      <h1>Topics</h1>

      <div>
        <label>
          Max Layer: {maxLayer}
          <input
            type="range"
            min={1}
            max={3}
            value={maxLayer}
            onChange={(e) => setMaxLayer(Number(e.target.value))}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={showCourses}
            onChange={(e) => setShowCourses(e.target.checked)}
          />
          {' '}Courses
        </label>
        <label>
          <input
            type="checkbox"
            checked={showAchievements}
            onChange={(e) => setShowAchievements(e.target.checked)}
          />
          {' '}Achievements
        </label>
      </div>

      {isLoading && <p>Loading…</p>}
      {isError && <p>Failed to load topics.</p>}

      {data && (
        <>
          <p>{data.total} topics</p>
          <div>
            {data.items.map((topic) => (
              <TopicCard key={topic.id} topic={topic} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
