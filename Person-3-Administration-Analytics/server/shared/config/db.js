import mongoose from 'mongoose';

const globalCache = globalThis;
if (!globalCache.__swmMongooseCache) {
  globalCache.__swmMongooseCache = { conn: null, promise: null };
}

export async function connectDB(uriOverride) {
  const uri = uriOverride || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/swm_person3';
  if (globalCache.__swmMongooseCache.conn && mongoose.connection.readyState === 1) {
    return globalCache.__swmMongooseCache.conn;
  }
  if (!globalCache.__swmMongooseCache.promise) {
    mongoose.set('strictQuery', true);
    globalCache.__swmMongooseCache.promise = mongoose
      .connect(uri, { maxPoolSize: 10, serverSelectionTimeoutMS: 8000 })
      .then((m) => m);
  }
  globalCache.__swmMongooseCache.conn = await globalCache.__swmMongooseCache.promise;
  return globalCache.__swmMongooseCache.conn;
}

export function resetDBCache() {
  globalCache.__swmMongooseCache = { conn: null, promise: null };
}
