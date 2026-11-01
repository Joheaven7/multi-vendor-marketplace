import mongoose from "mongoose";
import { afterAll, afterEach, beforeAll, beforeEach, inject } from "vitest";
import { setImageStorage } from "../services/storage";
import { fakeStorage } from "./fake-storage";

beforeAll(async () => {
  await mongoose.connect(inject("mongoUri"), { dbName: "marketplace_test" });
  // Build indexes (unique email, unique slug...) for every model the test file loaded.
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
});

// Tests never reach a real image provider.
beforeEach(() => {
  fakeStorage.reset();
  setImageStorage(fakeStorage);
});

// Every test starts with empty collections.
afterEach(async () => {
  await Promise.all(Object.values(mongoose.models).map((model) => model.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
});