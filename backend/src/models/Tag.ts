import mongoose from 'mongoose'

const TagSchema = new mongoose.Schema({
  _id: { type: Number, required: true },
  name: { type: String, required: true },
  synonyms: { type: [String], default: [] },
})

export const Tag = mongoose.model('Tag', TagSchema)
