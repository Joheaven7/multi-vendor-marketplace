import { connectDB, disconnectDB } from "../config/db";
import { env } from "../config/env";
import { User } from "../models/User";
import { hashPassword } from "../utils/password";
import { logger } from "../utils/logger";

async function seedAdmin() {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
    logger.warn("ADMIN_EMAIL and ADMIN_PASSWORD are not set. Skipping admin seed.");
    return;
  }

  const email = env.ADMIN_EMAIL.toLowerCase();
  const existing = await User.findOne({ email });

  if (existing) {
    if (existing.role !== "ADMIN") {
      existing.role = "ADMIN";
      await existing.save();
      logger.info(`Existing user ${email} promoted to ADMIN`);
    } else {
      logger.info(`Admin ${email} already exists`);
    }
    return;
  }

  await User.create({
    name: env.ADMIN_NAME ?? "Marketplace Admin",
    email,
    passwordHash: await hashPassword(env.ADMIN_PASSWORD),
    role: "ADMIN",
  });
  logger.info(`Admin created: ${email}`);
}

/**
 * Seed script. Safe to run more than once.
 * Phase 3 adds categories, brands, demo sellers and products.
 */
async function seed() {
  await connectDB();
  await seedAdmin();
  await disconnectDB();
}

seed().catch((err) => {
  logger.error({ err }, "Seed failed");
  process.exit(1);
});