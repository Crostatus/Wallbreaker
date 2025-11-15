import pkg from "npm:pg@8.11.3";
import { WarAttackDBO, WarDBO, WarMemberDBO } from "./db_models/warDBO.ts";
import { ClanWar, ClanWarMember } from "../../models/shared.ts";
import { log } from "../../../utility/logger.ts";
const { Client } = pkg;

function asWarDBO(toParse: ClanWar): WarDBO {
    return {        
        start_time: toParse.startTime,
        preparation_start_time: toParse.preparationStartTime,
        attacks_per_member: toParse.attacksPerMember,
        end_time: toParse.endTime,
        
        clan_tag: toParse.clan.tag,
        clan_percentage: toParse.clan.destructionPercentage,
        clan_stars: toParse.clan.stars,
        clan_badge_url: toParse.clan.badgeUrls.large || null,
        
        enemy_clan_tag: toParse.opponent.tag,
        enemy_clan_percentage: toParse.opponent.destructionPercentage,
        enemy_clan_stars: toParse.opponent.stars,
        enemy_clan_badge_url: toParse.opponent.badgeUrls.large || null,
    } as WarDBO;
}

export function asWarMember(tag_clan: string, toParse: ClanWarMember): {member: WarMemberDBO, attacks: WarAttackDBO[]} {
    const memberDBO: WarMemberDBO = {
        tag_clan: tag_clan,
        tag: toParse.tag,
        name: toParse.name,
        town_hall_level: toParse.townHallLevel,
        position: toParse.mapPosition,
    } as WarMemberDBO;

    const attacksDBO = toParse.attacks.map(attack => {
        return {
            attacker_tag: attack.attackerTag,
            defender_tag: attack.defenderTag,
            stars: attack.stars,
            destruction_percentage: attack.destructionPercentage,
            duration: attack.duration,
        } as WarAttackDBO;
    });

    return { member: memberDBO, attacks: attacksDBO };
}


export class WarRepository {
    private client: InstanceType<typeof Client>;
  
    constructor(client?: InstanceType<typeof Client>) {
      this.client = client;
    }

    async insertFullWar(war: ClanWar) {
        
        await this.client.query("BEGIN");

        try {
            const warDBO = asWarDBO(war);
            const warId = await this.insertWar(warDBO);
  
            const warSituation = [
                ...war.clan.members.map(m => asWarMember(war.clan.tag, m)),
                ...war.opponent.members.map(m => asWarMember(war.opponent.tag, m)),
            ];
    
            const members: WarMemberDBO[] = warSituation.map(x => {
                x.member.war_id = warId; 
                return x.member;
            });

            const attacks: WarAttackDBO[] = warSituation.flatMap(x =>
                x.attacks.map(a => ({ ...a, war_id: warId }))
            );

            await this.insertWarMembers(warId, members);
            await this.insertWarAttacks(warId, attacks);

            await this.client.query("COMMIT");

            log.success(`War ${warId} updated with ${members.length} members and ${attacks.length} attacks`);
        } catch (err) {
            await this.client.query("ROLLBACK");
            throw err;
        }            
    }

    private async insertWar(war: WarDBO): Promise<number> {
        const sql = `
          INSERT INTO wars (
            start_time, preparation_start_time, attacks_per_member, end_time,
            clan_tag, clan_percentage, clan_stars, clan_badge_url,
            enemy_clan_tag, enemy_clan_percentage, enemy_clan_stars, enemy_clan_badge_url
          )
          VALUES (
            $1,$2,$3,$4,
            $5,$6,$7,$8,
            $9,$10,$11,$12
          )
          ON CONFLICT (clan_tag, start_time) DO UPDATE SET
            preparation_start_time = EXCLUDED.preparation_start_time,
            attacks_per_member = EXCLUDED.attacks_per_member,
            end_time = EXCLUDED.end_time,
            clan_percentage = EXCLUDED.clan_percentage,
            clan_stars = EXCLUDED.clan_stars,
            clan_badge_url = EXCLUDED.clan_badge_url,
            enemy_clan_tag = EXCLUDED.enemy_clan_tag,
            enemy_clan_percentage = EXCLUDED.enemy_clan_percentage,
            enemy_clan_stars = EXCLUDED.enemy_clan_stars,
            enemy_clan_badge_url = EXCLUDED.enemy_clan_badge_url
          RETURNING id;
        `;
      
        const values = [
          war.start_time,
          war.preparation_start_time,
          war.attacks_per_member,
          war.end_time,
          war.clan_tag,
          war.clan_percentage,
          war.clan_stars,
          war.clan_badge_url,
          war.enemy_clan_tag,
          war.enemy_clan_percentage,
          war.enemy_clan_stars,
          war.enemy_clan_badge_url,
        ];
      
        const res = await this.client.query(sql, values);
        return res.rows[0].id;
    }

    private async insertWarMembers(warId: number, members: WarMemberDBO[]) {
        if (members.length === 0) return;
      
        const values: any[] = [];
        const placeholders = members
          .map((m, i) => {
            const o = i * 6;
            values.push(warId, m.tag_clan, m.tag, m.name, m.town_hall_level, m.position);
            return `($${o+1},$${o+2},$${o+3},$${o+4},$${o+5},$${o+6})`;
          })
          .join(",");
      
        const sql = `
          INSERT INTO war_members (
            war_id, tag_clan, tag, name, town_hall_level, position
          )
          VALUES ${placeholders}
          ON CONFLICT (war_id, tag) DO UPDATE SET
            tag_clan = EXCLUDED.tag_clan,
            name = EXCLUDED.name,
            town_hall_level = EXCLUDED.town_hall_level,
            position = EXCLUDED.position;
        `;
      
        await this.client.query(sql, values);
    }
      
    private async insertWarAttacks(warId: number, attacks: WarAttackDBO[]) {
        if (attacks.length === 0) return;
        
        const values: any[] = [];
        const placeholders = attacks
            .map((a, i) => {
            const o = i * 6;
            values.push(
                warId,
                a.attacker_tag,
                a.defender_tag,
                a.stars,
                a.destruction_percentage,
                a.duration
            );
            return `($${o+1},$${o+2},$${o+3},$${o+4},$${o+5},$${o+6})`;
            })
            .join(",");
        
        const sql = `
            INSERT INTO war_attacks (
            war_id, attacker_tag, defender_tag,
            stars, destruction_percentage, duration
            )
            VALUES ${placeholders}
            ON CONFLICT (war_id, attacker_tag, defender_tag) DO UPDATE SET
            stars = EXCLUDED.stars,
            destruction_percentage = EXCLUDED.destruction_percentage,
            duration = EXCLUDED.duration;
        `;
    
        await this.client.query(sql, values);
    }      

    async findActiveOrRecentWars(): Promise<WarDBO[]> {
      const sql = `
        SELECT *
        FROM wars
        WHERE start_time <= NOW()
          AND NOW() <= end_time + INTERVAL '10 minutes'
      `;
    
      const res = await this.client.query(sql);
      return res.rows as WarDBO[];
    }
    
}