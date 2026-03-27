import type { TopicTagDto } from '../types/api'

interface Props {
  tag: TopicTagDto
}

export function TagBadge({ tag }: Props) {
  return (
    <span title={`weight: ${tag.weight}`} style={{ marginRight: 4 }}>
      {tag.label}
    </span>
  )
}
