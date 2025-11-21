import { WarImageGenerator } from './supercell/image_generators/war_gen/warImageGenerator';
import { ClashCardGenerator } from './supercell/image_generators/clashCardGenerator.ts';
import { HttpClashOfClansClient } from './supercell/httpClashOfClansClient.ts';
import { config } from "https://deno.land/x/dotenv/mod.ts";
import { log } from "./utility/logger.ts";
import { Repository } from "./supercell/db/repository/repository.ts";
import { startClanUpdateTask } from "./supercell/startClanUpdateTask.ts";
import { setupShutdownHandlers } from "./utility/sigHandlers.ts";
import { startWarAttackUpdateTask } from "./supercell/startWarAttackUpdate.ts";
import { ClashBot } from "./supercell/bot.ts";
import { WarStateManager } from "./supercell/warStateManager.ts";
import { startWarDiscoveryTask } from "./supercell/warScout.ts";
const env = config();

log.info("Hello world!");
log.debug("Sometimes it’s difficult even for me to understand what I’ve become. And harder still to remember what I once was")


const repo = new Repository();
setupShutdownHandlers(repo);

await repo.connect();
const api = new HttpClashOfClansClient(Deno.env.get("SUPERCELL_KEY") || env.SUPERCELL_KEY!);
const imageGenerator = new ClashCardGenerator();
imageGenerator.init();

let bot: ClashBot | null = null;
const telegramKey = Deno.env.get("TELEGRAM_KEY") || env.TELEGRAM_KEY;
if (telegramKey) {
    bot = new ClashBot(telegramKey, api, repo, imageGenerator);
    bot.start();
}
else {
    log.warn("No TELEGRAM_KEY detected, telegram bot disable");
}

const warState = new WarStateManager();

startClanUpdateTask(repo, api, {
    intervalSeconds: 600,
    staleHours: 12,
});
startWarDiscoveryTask(repo, api, {
    intervalMinutes: 15,
});
startWarAttackUpdateTask(repo, api, warState, bot, {
    intervalSeconds: 30,
    ifWarCheckEverySeconds: 60,
});

log.info("Background tasks up and running!");
