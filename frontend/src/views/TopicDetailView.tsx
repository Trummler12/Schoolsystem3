import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { get, ApiError } from '../services/apiClient'
import type { TopicResolutionResponse } from '../types/api'
import { TagBadge } from '../components/TagBadge'
import { TopicCard } from '../components/TopicCard'

export default function TopicDetailView() {
  const { id } = useParams<{ id: string }>()

  const { data, isLoading, error } = useQuery({
    queryKey: ['topic', id],
    queryFn: () => get<TopicResolutionResponse>(`/api/v1/topics/${id}`),
    retry: false,
  })

  if (isLoading) return <p>Loading…</p>

  if (error) {
    const status = error instanceof ApiError ? error.status : 0
    return (
      <div>
        <p>{status === 404 ? `Topic "${id}" not found.` : 'Something went wrong.'}</p>
        <Link to="/topics">← Back to Topics</Link>
      </div>
    )
  }

  if (!data) return null

  if (data.resolutionStatus === 'AMBIGUOUS') {
    return (
      <div>
        <h2>Which topic did you mean?</h2>
        {data.candidates.map((c) => (
          <TopicCard key={c.id} topic={c} />
        ))}
        <Link to="/topics">← Back to Topics</Link>
      </div>
    )
  }

  const { topic } = data

  return (
    <div>
      <Link to="/topics">← Back to Topics</Link>
      <h1>{topic.name}</h1>
      <p>
        <strong>Type:</strong> {topic.typeName} &nbsp;
        <strong>Layer:</strong> {topic.layer} &nbsp;
        <strong>Version:</strong> {topic.version}
      </p>
      <p>{topic.description}</p>

      {topic.tags.length > 0 && (
        <section>
          <h3>Tags</h3>
          <div>
            {topic.tags.map((t) => (
              <TagBadge key={t.tagId} tag={t} />
            ))}
          </div>
        </section>
      )}

      {topic.urls.length > 0 && (
        <section>
          <h3>Links</h3>
          <ul>
            {topic.urls.map((url) => (
              <li key={url}>
                <a href={url} target="_blank" rel="noopener noreferrer">{url}</a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {topic.levels.length > 0 && (
        <section>
          <h3>Levels</h3>
          <table>
            <thead>
              <tr><th>Level</th><th>Description</th></tr>
            </thead>
            <tbody>
              {topic.levels.map((l) => (
                <tr key={l.levelNumber}>
                  <td>{l.levelNumber}</td>
                  <td>{l.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section>
        <h3>Resources</h3>
        <p><em>Coming in Slice 2c.</em></p>
      </section>
    </div>
  )
}
