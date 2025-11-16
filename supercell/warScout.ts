import { log } from "../utility/logger.ts";
import { Repository } from "./db/repository/repository.ts";
import { HttpClashOfClansClient } from "./httpClashOfClansClient.ts";

export interface WarDiscoveryTaskConfig {
  intervalMinutes: number;
}

export function startWarDiscoveryTask(
  repo: Repository,
  api: HttpClashOfClansClient,
  config: WarDiscoveryTaskConfig,
) {
  const intervalMs = config.intervalMinutes * 60 * 1000;  

  log.info(
    `📅 War Discovery Task starting (interval: ${config.intervalMinutes} minutes)…`,
  );

  setInterval(async () => {
    log.info("🔍 War Discovery Task tick…");

    try {      
      const clans = await repo.war.findClansWithoutActiveWar();

      if (clans.length === 0) {
        log.info("🏖 No clans available without a war");
        return;
      }

      log.info(`📡 Checking ${clans.length} clans for potential new wars…`);

      for (const clanTag of clans) {
        log.debug(`Checking current war for clan ${clanTag}…`);

        const warRes = await api.getCurrentWar(clanTag);

        if (!warRes.ok) {
          log.warn(
            `Supercell API error for clan ${clanTag}: ${warRes.error.reason}`,
          );
          continue;
        }

        const warData = warRes.data;        
        try {
          await repo.war.insertFullWar(warData);
          log.success(`🛡 War stored for clan ${clanTag}`);
        } catch (err) {
          log.error(`Failed to save war for clan ${clanTag}: ${err}`);
        }
      }
    } catch (err) {
      log.error(`💥 War Discovery Task crashed: ${err}`);
    }
  }, intervalMs);

  log.success("🚀 War Discovery Task is running");
}
