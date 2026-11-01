import { connectDB, disconnectDB } from "../config/db";
import { env } from "../config/env";
import { logger } from "../utils/logger";
import { DEMO_CUSTOMER, DEMO_PASSWORD, DEMO_SELLERS } from "./demo-data";
import { resetDemoData, seedDemoData } from "./demo-seed";

/**
 * npm run seed:demo             add the demo data (safe to repeat)
 * npm run seed:demo -- --reset  remove the demo accounts and products first, then add them again
 */
async function main() {
  if (env.NODE_ENV === "production") {
    logger.error("Refusing to seed demo data in production (it creates accounts with a known password).");
    process.exit(1);
  }

  await connectDB();
  try {
    if (process.argv.includes("--reset")) {
      logger.info(await resetDemoData(), "Removed existing demo data");
    }

    logger.info(await seedDemoData(), "Demo data ready (counts show what was newly created)");

    console.log("\nDemo accounts (password for all: " + DEMO_PASSWORD + ")");
    console.log(`  customer  ${DEMO_CUSTOMER.email}`);
    for (const seller of DEMO_SELLERS) {
      const note = seller.status === "PENDING" ? "application waiting for approval" : "approved seller";
      console.log(`  seller    ${seller.owner.email}  (${seller.storeName}: ${note})`);
    }
    console.log("  admin     the account from ADMIN_EMAIL (run `npm run seed` first)\n");
  } finally {
    await disconnectDB();
  }
}

main().catch((err) => {
  logger.error({ err }, "Demo seed failed");
  process.exit(1);
});