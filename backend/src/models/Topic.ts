import mongoose from 'mongoose'

const LevelSchema = new mongoose.Schema(
  {
    levelNumber: { type: Number, required: true },
    description: { type: String, required: true },
  },
  { _id: false },
)

const TopicTagSchema = new mongoose.Schema(
  {
    tagId: { type: Number, required: true },
    weight: { type: Number, required: true },
    label: { type: String, required: true },
  },
  { _id: false },
)

const TopicSchema = new mongoose.Schema({
  _id: { type: String, required: true },   // topicID, e.g. "ART0"
  name: { type: String, required: true },
  typeId: { type: Number, required: true },
  typeName: { type: String, required: true }, // denormalized from t_topic_type
  layer: { type: Number, required: true },
  description: { type: String, required: true },
  version: { type: Number, required: true },
  urls: { type: [String], default: [] },
  levels: { type: [LevelSchema], default: [] },
  tags: { type: [TopicTagSchema], default: [] },
})

export const Topic = mongoose.model('Topic', TopicSchema)
