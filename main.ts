import { HttpClashOfClansClient } from './supercell/httpClashOfClansClient.ts';
import { config } from "https://deno.land/x/dotenv/mod.ts";
import { log } from "./utility/logger.ts";
import { Repository } from "./supercell/db/repository/repository.ts";
import { startClanUpdateTask } from "./supercell/startClanUpdateTask.ts";
import { setupShutdownHandlers } from "./utility/sigHandlers.ts";
import { startWarAttackUpdateTask } from "./supercell/startWarAttackUpdate.ts";
const env = config();

log.info("Hello world!");
log.debug("Sometimes it’s difficult even for me to understand what I’ve become. And harder still to remember what I once was")


const repo = new Repository();
setupShutdownHandlers(repo);

await repo.connect();
const api = new HttpClashOfClansClient(env.SUPERCELL_KEY!);

startClanUpdateTask(repo, api, {
    intervalSeconds: 600,
    staleHours: 12,
});
startWarAttackUpdateTask(repo, api, {
    intervalSeconds: 10,
    ifWarCheckEverySeconds: 60,
})
  
log.info("🚀 Background tasks running");
