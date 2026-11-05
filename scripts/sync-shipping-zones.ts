/**
 * Updates ONLY the shipping zones + cash on delivery to the old site's rules (scripts/data/shipping-zones.ts).
 * Nothing else in the database is touched (unlike db:seed, which also re-syncs products and pages).
 *
 * Usage (stop `npm run dev` first: the local database can be open in one program only):
 *   npx tsx scripts/sync-shipping-zones.ts            only replaces zones nobody has edited yet
 *   npx tsx scripts/sync-shipping-zones.ts --replace  replaces all zones (admin edits are lost)
 */
import "./lib/env";
import { connect } from "./lib/connect";
import { applyDefaultZones } from "./lib/shipping-zones";

async function main() {
  const { db, close, kind } = await connect();
  const result = await applyDefaultZones(db, { replace: process.argv.includes("--replace") });
  await close();
  console.log(
    result === "current"
      ? `Shipping zones in the ${kind} database already use the old site's rules. Nothing changed.`
      : result === "kept"
      ? `Shipping zones in the ${kind} database were edited in the admin, so they were NOT changed. Run again with --replace to overwrite them.`
      : `Shipping zones in the ${kind} database ${result === "replaced" ? "replaced with" : "set to"} the old site's rules.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
