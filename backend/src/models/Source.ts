import mongoose from 'mongoose'

const SourceSchema = new mongoose.Schema({
  _id: { type: Number, required: true },   // sourceID
  typeId: { type: Number, required: true },
  typeName: { type: String, required: true }, // denormalized from t_source_type
  url: { type: String, required: true },
  authorId: { type: Number, required: true },
  authorName: { type: String, default: '' }, // denormalized from t_source_author
  title: { type: String, required: true },
  description: { type: String, required: true },
  createdAt: { type: Date, required: true },
  updatedAt: { type: Date, required: true },
})

export const Source = mongoose.model('Source', SourceSchema)
