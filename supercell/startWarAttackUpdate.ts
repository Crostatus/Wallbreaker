import { ClashBot } from './bot.ts';
import { WarStateManager } from './warStateManager.ts';
import { log } from "../utility/logger.ts";
import { Repository } from "./db/repository/repository.ts";
import { HttpClashOfClansClient } from "./httpClashOfClansClient.ts";
import { asWarMember } from "./db/repository/warRepository.ts";

const lastWarFetch = new Map<number, number>(); // warId → timestamp

interface WarAttackTaskConfig {
  intervalSeconds: number; // run every X seconds (10s)
  ifWarCheckEverySeconds: number;
}

export function startWarAttackUpdateTask(
    repo: Repository,
    api: HttpClashOfClansClient,
    warState: WarStateManager,
    bot: ClashBot,
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
                log.debug("🌙 No active war found");
                return;
            }

            log.info(`🔍 Found ${wars.length} relevant wars`);

            const now = Date.now();

            for (const war of wars) {
                const clanTag = war.clan_tag;
                
                const clan = await repo.clan.findClanByTag(clanTag);

                if (!clan) {
                    log.warn(`Clan ${clanTag} not found in DB (skipping update).`);
                    continue;
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
                    log.debug(`⏸️ War ${war.id} fetch skipped. Need ${wait}s more`);
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

                const playerNameMap = new Map<string, string>();
                for (const m of warRes.data.clan.members) {
                    playerNameMap.set(m.tag, m.name);
                }
                
                for (const m of warRes.data.opponent.members) {
                    playerNameMap.set(m.tag, m.name);
                }

                const warSituation = [
                    ...warRes.data.clan.members.map(m => asWarMember(war.clan_tag, m)),
                    ...warRes.data.opponent.members.map(m => asWarMember(war.enemy_clan_tag, m)),
                ];
                
                const allAttacks = warSituation.flatMap(x => x.attacks).map(a => ({
                    attacker_tag: a.attacker_tag,                    
                    defender_tag: a.defender_tag,
                    stars: a.stars,
                    percentage: a.destruction_percentage,
                    duration: a.duration,
                }));

                const newAttacks = await warState.processWarUpdate(
                    war.id,
                    allAttacks
                );

                const bestStarsMap = await repo.war.getBestStarsForWar(war.id);
                const formattedAttacks = await Promise.all(
                    newAttacks.map(atk => {
                        const previousBest = bestStarsMap.get(atk.defender_tag) ?? 0;
                  
                        return {
                            attacker_name: playerNameMap.get(atk.attacker_tag) || atk.attacker_tag,
                            defender_name: playerNameMap.get(atk.defender_tag) || atk.defender_tag,
                            stars: atk.stars,
                            percentage: atk.percentage,
                            duration: atk.duration,
                            starsGained: Math.max(0, atk.stars - previousBest),
                        };
                    })
                );

                await bot.notifyNewAttacks(clan.name, war.enemy_clan_name, {
                    clanStars: warRes.data.clan.stars,
                    clanPercentage: warRes.data.clan.destructionPercentage,
                    oppStars: warRes.data.opponent.stars,
                    oppPercentage: warRes.data.opponent.destructionPercentage,
                    }, 
                    formattedAttacks
                );

            }
        }
        catch (err) {
            log.error(`War Attack Update Task crashed: ${err}`);
        }
    }, intervalSeconds * 1000);

    log.success("🚀 War Attack Update Task is running");
}
