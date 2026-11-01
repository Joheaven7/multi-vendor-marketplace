import mongoose, { type ClientSession } from "mongoose";

/**
 * Runs `work` in a MongoDB transaction. All writes inside must pass `{ session }`.
 * If anything throws, every write is rolled back.
 * Requires a replica set (MongoDB Atlas always is one).
 */
export async function runInTransaction<T>(
  work: (session: ClientSession) => Promise<T>,
): Promise<T> {
  const session = await mongoose.startSession();
  try {
    let result: T | undefined;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result as T;
  } finally {
    await session.endSession();
  }
}