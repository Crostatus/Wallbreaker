import { log } from "../utility/logger.ts";
import { Repository } from "./db/repository/repository.ts";
import { HttpClashOfClansClient } from "./httpClashOfClansClient.ts";

interface ClanUpdateTaskConfig {
  intervalSeconds: number;
  staleHours: number;
}

export function startClanUpdateTask(
  repo: Repository,
  api: HttpClashOfClansClient,
  config: ClanUpdateTaskConfig,
) {
  const { intervalSeconds, staleHours } = config;

  log.info(
    `⏳ Starting Clan Update Task (interval: ${intervalSeconds}s, stale threshold: ${staleHours}h)…`,
  );

  setInterval(async () => {
    try {      
      const outdated = await repo.clan.findOutdatedClans(staleHours);

      if (outdated.length === 0) {
        log.debug("🌙 No outdated clans found");
        return;
      }

      log.info(`🔍 Found ${outdated.length} clans to refresh…`);
      
      for (const clan of outdated) {
        log.info(`📡 Fetching updated data for clan ${clan.tag}…`);

        const res = await api.getClan(clan.tag);

        if (!res.ok) {
          log.error(
            `Failed to refresh clan ${clan.tag}: ${res.error.reason}`,
          );
          continue;
        }

        const fresh = res.data;
        
        await repo.clan.insertClan(fresh);

        log.success(`Clan ${clan.tag} updated successfully.`);
      }
    } catch (err) {
      log.error(`💥 Clan Update Task crashed: ${err}`);
    }
  }, intervalSeconds * 1000);

  log.success("🚀 Clan Update Task up and running.");
}
