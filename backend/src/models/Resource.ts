import mongoose from 'mongoose'

// For the PoC: each t_source row with sa_resource=1 is a standalone Resource.
// Resources can reference multiple Sources (ct_uses_source), but for now
// the source and resource share the same ID.
// Top-N topics this resource is assigned to (computed at seeding via tag-overlap).
// Topics are unbounded — any number of resources may point to them.
const ResourceTopicRefSchema = new mongoose.Schema(
  {
    topicId: { type: String, required: true },
    overlapScore: { type: Number, required: true },
  },
  { _id: false },
)

const ResourceSchema = new mongoose.Schema({
  _id: { type: Number, required: true },   // resourceID (= sourceID for standalone resources)
  typeId: { type: Number, required: true },
  typeName: { type: String, required: true }, // denormalized from t_source_type
  url: { type: String, required: true },
  authorId: { type: Number, required: true },
  authorName: { type: String, default: '' }, // denormalized from t_source_author
  title: { type: String, required: true },
  description: { type: String, required: true },
  createdAt: { type: Date, required: true },
  updatedAt: { type: Date, required: true },
  topTopics: { type: [ResourceTopicRefSchema], default: [] }, // top-5 topics by overlap score
})

export const Resource = mongoose.model('Resource', ResourceSchema)
