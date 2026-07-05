import mongoose from 'mongoose'

declare global {
  // eslint-disable-next-line no-var
  var _mongooseConn: Promise<typeof mongoose> | undefined
}

export async function connectDb(): Promise<void> {
  if (mongoose.connection.readyState >= 1) return

  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI environment variable is not set')

  if (!global._mongooseConn) {
    global._mongooseConn = mongoose.connect(uri, { bufferCommands: false })
  }

  await global._mongooseConn
}
