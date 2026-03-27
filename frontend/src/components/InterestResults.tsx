import { Link } from 'react-router-dom'
import type { InterestSearchResponseDto } from '../types/api'

interface Props {
  data: InterestSearchResponseDto
}

export function InterestResults({ data }: Props) {
  const isStub = data.matchedTags.length === 0

  return (
    <div>
      {isStub && (
        <p><em>Interest matching is not yet available — LLM provider pending.</em></p>
      )}

      {!isStub && data.matchedTags.length > 0 && (
        <section>
          <h3>Matched tags</h3>
          <div>
            {data.matchedTags.map((t) => (
              <span key={t.tagId} title={`interest weight: ${t.interestWeight}`} style={{ marginRight: 6 }}>
                {t.label} ({t.interestWeight})
              </span>
            ))}
          </div>
        </section>
      )}

      {!isStub && data.topics.length === 0 && (
        <p>No matching topics found — try different interests.</p>
      )}

      {data.topics.length > 0 && (
        <section>
          <h3>Topics ({data.topics.length})</h3>
          <ul>
            {data.topics.map((t) => (
              <li key={t.id}>
                <Link to={`/topics/${t.id}`}>
                  <strong>{t.name}</strong>
                </Link>
                {' — '}{t.typeName}, Layer {t.layer}, Score {t.score}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
