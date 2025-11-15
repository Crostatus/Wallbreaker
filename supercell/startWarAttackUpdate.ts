

import { log } from "../utility/logger.ts";
import { Repository } from "./db/repository/repository.ts";
import { HttpClashOfClansClient } from "./httpClashOfClansClient.ts";

const lastWarFetch = new Map<number, number>(); // warId → timestamp

interface WarAttackTaskConfig {
  intervalSeconds: number; // run every X seconds (10s)
  ifWarCheckEverySeconds: number;
}

export function startWarAttackUpdateTask(
  repo: Repository,
  api: HttpClashOfClansClient,
  config: WarAttackTaskConfig,
) {
    const { intervalSeconds, ifWarCheckEverySeconds } = config;
    const ifWarCheckEveryMs = ifWarCheckEverySeconds * 1000;

    log.info(
        `Starting War Attack Update Task (interval: ${intervalSeconds}s)…`,
    );

    setInterval(async () => {
        try {      
            const wars = await repo.war.findActiveOrRecentWars();
            if (wars.length === 0) {        
                return;
            }

            log.info(`🔍 Found ${wars.length} relevant wars`);

            const now = Date.now();

            for (const war of wars) {
                const clanTag = war.clan_tag;
                
                const clan = await repo.clan.findClanByTag(clanTag);

                if (!clan) {
                    log.warn(`Clan ${clanTag} not found in DB (skipping update).`);
                } 
                else {
                    if (new Date(clan.updatedAt!).getTime() < new Date(war.start_time).getTime()) {
                        log.info(`🔄 Refreshing clan ${clanTag} because war started after last update…`);

                        const clanRes = await api.getClan(clanTag);
                        if (clanRes.ok) {
                        await repo.clan.insertClan(clanRes.data);
                        await repo.clan.insertClanMembers(clanRes.data.tag, clanRes.data.memberList);
                        log.success(`Clan ${clanTag} refreshed before war update.`);
                        } else {
                        log.error(`Failed to refresh clan ${clanTag}: ${clanRes.error.reason}`);
                        }
                    }
                }
                
                const last = lastWarFetch.get(war.id) ?? 0;
                const elapsed = now - last;

                if (elapsed < ifWarCheckEveryMs) {
                    const wait = ((ifWarCheckEveryMs - elapsed) / 1000).toFixed(1);
                    log.debug(`⏸️ War ${war.id} fetch skipped. Need ${wait}s more.`);
                    continue;
                }
            
                log.info(`📡 Fetching updated war data for clan ${clanTag} (war ${war.id})…`);
                const warRes = await api.getCurrentWar(clanTag);

                if (!warRes.ok) {
                    log.error(`Failed to update war ${war.id} (${clanTag}): ${warRes.error.reason}`);
                    continue;
                }        
                lastWarFetch.set(war.id, Date.now());
                
                await repo.war.insertFullWar(warRes.data);

                log.success(`🏆 War ${war.id} updated successfully.`);
            }
        }
        catch (err) {
            log.error(`💥 War Attack Update Task crashed: ${err}`);
        }
    }, intervalSeconds * 1000);

    log.success("🚀 War Attack Update Task is running.");
}
