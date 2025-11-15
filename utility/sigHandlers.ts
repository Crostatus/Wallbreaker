import { Repository } from "../supercell/db/repository/repository.ts";
import { log } from "./logger.ts";

export function setupShutdownHandlers(repo: Repository) {
    const shutdown = async (signal: string) => {
      log.info(`Received ${signal}. Cleaning up…`);
      try {
        await repo.disconnect();        
      } catch (e) {
          log.error("❌ Failed to close DB");
          console.log(e);
      }
      log.info("👋 Bye bye");
      Deno.exit(0);
    };
  
    Deno.addSignalListener("SIGINT", () => shutdown("SIGINT"));   // Ctrl+C
    Deno.addSignalListener("SIGTERM", () => shutdown("SIGTERM")); // Docker stop
}