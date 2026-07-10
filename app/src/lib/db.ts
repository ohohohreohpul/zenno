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
    // Drop the cached promise on failure — otherwise a warm serverless
    // instance whose first connect failed keeps re-awaiting the same
    // rejected promise and never retries.
    global._mongooseConn = mongoose.connect(uri, { bufferCommands: false }).catch(
      (error: unknown) => {
        global._mongooseConn = undefined
        throw error
      },
    )
  }

  await global._mongooseConn
}
