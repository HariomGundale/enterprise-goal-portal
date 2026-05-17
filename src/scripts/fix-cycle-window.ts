/**
 * Re-opens the active cycle goal-setting window (relative to today).
 * Run: npm run fix-cycle
 */
import "./load-env";
import { connectDB, disconnectDB } from "@/lib/db";
import { Cycle } from "@/models/Cycle";

async function fix() {
  await connectDB();

  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 30);
  const end = new Date(now);
  end.setDate(end.getDate() + 90);

  const result = await Cycle.updateOne(
    { status: "active" },
    {
      $set: {
        "goalSettingWindow.startDate": start,
        "goalSettingWindow.endDate": end,
      },
    },
  );

  if (result.matchedCount === 0) {
    console.error("No active cycle found. Run npm run seed first.");
    process.exitCode = 1;
    return;
  }

  console.log("Active cycle goal-setting window updated:");
  console.log(`  Start: ${start.toLocaleDateString()}`);
  console.log(`  End:   ${end.toLocaleDateString()}`);
  console.log("\nRefresh the app, then submit goal sheets for manager approval.");
}

fix()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => disconnectDB());
