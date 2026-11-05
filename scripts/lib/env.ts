/** Loads .env.local then .env for command-line scripts (Next.js loads these itself). */
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });
