import { Link } from 'react-router-dom'
import type { TopicSummaryDto } from '../types/api'
import { TagBadge } from './TagBadge'

interface Props {
  topic: TopicSummaryDto
}

export function TopicCard({ topic }: Props) {
  return (
    <Link to={`/topics/${topic.id}`} style={{ display: 'block', textDecoration: 'none' }}>
      <div>
        <strong>{topic.name}</strong>
        <span> — {topic.typeName}, Layer {topic.layer}</span>
        <p>{topic.description}</p>
        <div>
          {topic.tags.map((t) => (
            <TagBadge key={t.tagId} tag={t} />
          ))}
        </div>
      </div>
    </Link>
  )
}
