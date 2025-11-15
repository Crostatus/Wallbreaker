import pkg from "npm:pg@8.11.3";
const { Client } = pkg;
import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";
import { log } from "../../../utility/logger.ts";
import { ClanRepository } from "./clanRepository.ts";
import { WarRepository } from "./warRepository.ts";


const env = await load();
const DB_CONFIG = {
  hostname: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,  
};


export class Repository {
    private client: InstanceType<typeof Client>;
  
    public clan: ClanRepository;
    public war: WarRepository;

    constructor(client?: InstanceType<typeof Client>) {
      this.client = client ?? new Client(DB_CONFIG);
      this.clan = new ClanRepository(this.client);
      this.war = new WarRepository(this.client);
    }
  
    async connect() {
      await this.client.connect();
      log.info("🔌 DB connected.");
    }
  
    async disconnect() {
      await this.client.end();
      log.info("🔌 DB connection closed.");
    }
    
}