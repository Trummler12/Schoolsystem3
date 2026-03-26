import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

// .env liegt im Repo-Root (zwei Ebenen über scripts/)
const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, '../../../.env') })

import mongoose from 'mongoose'

const reset = process.argv.includes('--reset')

const main = async () => {
  const mongoUri = process.env.MONGO_URI ?? 'mongodb://localhost:27017/schoolsystem3'
  await mongoose.connect(mongoUri)
  console.log('MongoDB verbunden')

  if (reset) {
    console.log('Reset-Modus: Collections werden geleert...')
    // TODO: await Promise.all([TopicModel.deleteMany(), TagModel.deleteMany(), ...])
  }

  // TODO: CSV-Dateien aus data/import/ einlesen und als Mongoose-Dokumente speichern

  await mongoose.disconnect()
  console.log('Seeding abgeschlossen')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
