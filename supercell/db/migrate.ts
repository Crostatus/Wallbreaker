import pkg from "npm:pg@8.11.3";
const { Client } = pkg;
import { join } from "https://deno.land/std@0.224.0/path/mod.ts";
import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";
import { log } from "../../utility/logger.ts";

const env = await load();

const migrationsDir = new URL("../../supercell/db/migrations", import.meta.url).pathname;

const nukeDB = env.DB_NUKE_ON_MIGRATE === "true";
const nukePath = new URL("../../supercell/db/nuke.sql", import.meta.url).pathname;

if (nukeDB) {
  log.warn(`Going to nuke the database before migration 💣`);
}

const DB_CONFIG = {
  host: Deno.env.get("DB_HOST") || env.DB_HOST,
  port: Deno.env.get("DB_PORT") || env.DB_PORT,
  user: Deno.env.get("DB_USER") || env.DB_USER,
  password: Deno.env.get("DB_PASSWORD") || env.DB_PASSWORD,
  database: Deno.env.get("DB_NAME") || env.DB_NAME,
};

let client;

await connectDB();
await migrate();

async function connectDB() {
  const maxRetries = 10;
  const retryDelay = 3000; // 3 seconds

  for (let i = 0; i < maxRetries; i++) {
    try {
      client = new Client(DB_CONFIG);
      log.debug(`Attempting to connect to DB at ${DB_CONFIG.hostname}:${DB_CONFIG.port} (Attempt ${i + 1}/${maxRetries})`);
      await client.connect();
      log.success("Connected to DB");
      return;
    } catch (err) {
      console.error(err);
      log.warn(`Failed to connect to DB (Attempt ${i + 1}/${maxRetries}): ${err}`);
      try { await client.end(); } catch { }
      if (i < maxRetries - 1) {
        log.info(`Retrying in ${retryDelay / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      } else {
        log.error(`Could not connect to DB after ${maxRetries} attempts. Exiting.`);
        Deno.exit(1);
      }
    }
  }
}

export async function migrate() {

  if (nukeDB) {
    log.trace("Nuking database...");
    await client.query(Deno.readTextFileSync(nukePath));
    log.warn("Database nuked 💥");
  }

  await client.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      executed_at TIMESTAMP DEFAULT NOW()
    );
  `);

  const files = [...Deno.readDirSync(migrationsDir)]
    .filter(f => f.isFile && f.name.endsWith(".sql"))
    .map(f => f.name)
    .sort();

  for (const file of files) {
    const res = await client.query(
      "SELECT 1 FROM migrations WHERE name = $1",
      [file],
    );
    if (res.rowCount === 0) {
      log.debug(`Running migration ${file} 🏗️`);
      const sql = await Deno.readTextFile(join(migrationsDir, file));
      await client.query(sql);
      await client.query(
        "INSERT INTO migrations (name) VALUES ($1)",
        [file],
      );
    } else {
      log.debug(`Migration ${file} already applied`);
    }
  }

  await client.end();
  log.success("Migration complete 🎉");
}
