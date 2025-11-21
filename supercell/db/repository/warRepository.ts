import pkg from "npm:pg@8.11.3";
import { WarAttackDBO, WarAttackHistoryDBO, WarCardHeaderDBO, WarCardMemberDBO, WarDBO, WarMemberDBO, WarMemberForPlanningRowDBO } from "./db_models/warDBO.ts";
import { ClanWar, ClanWarMember } from "../../models/shared.ts";
import { log } from "../../../utility/logger.ts";
const { Client } = pkg;

export function asWarDBO(toParse: ClanWar): WarDBO {
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
        enemy_clan_name: toParse.opponent.name,
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
        town_hall_level: toParse.townhallLevel,
        position: toParse.mapPosition,
    } as WarMemberDBO;

    const attacksDBO = toParse.attacks?.map(attack => {
        return {
            attacker_tag: attack.attackerTag,
            defender_tag: attack.defenderTag,
            stars: attack.stars,
            destruction_percentage: attack.destructionPercentage,
            duration: attack.duration,            
        } as WarAttackDBO;
    }) ?? [];

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
            log.trace(`Inserting war: ${warDBO.clan_tag} vs ${warDBO.enemy_clan_tag}`);
            const warId = await this.insertWar(warDBO);
            log.trace(`War header inserted with ID: ${warId}`);

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
            
            log.trace(`Inserting ${members.length} war members for war ID ${warId}`);
            await this.insertWarMembers(warId, members);
            log.trace(`Inserting ${attacks.length} war attacks for war ID ${warId}`);
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
            enemy_clan_tag, enemy_clan_name, enemy_clan_percentage, enemy_clan_stars, enemy_clan_badge_url
          )
          VALUES (
            $1,$2,$3,$4,
            $5,$6,$7,$8,
            $9,$10,$11,$12,$13
          )
          ON CONFLICT (clan_tag, start_time) DO UPDATE SET
            preparation_start_time = EXCLUDED.preparation_start_time,
            attacks_per_member = EXCLUDED.attacks_per_member,
            end_time = EXCLUDED.end_time,
            clan_percentage = EXCLUDED.clan_percentage,
            clan_stars = EXCLUDED.clan_stars,
            clan_badge_url = EXCLUDED.clan_badge_url,
            enemy_clan_tag = EXCLUDED.enemy_clan_tag,
            enemy_clan_name = EXCLUDED.enemy_clan_name,
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
          war.enemy_clan_name,
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

  async getBestStarsBeforeAttack(warId: number, defenderTag: string): Promise<number> {
    const res = await this.client.query(
        `SELECT MAX(stars) AS best
          FROM war_attacks
          WHERE war_id = $1 AND defender_tag = $2`,
        [warId, defenderTag]
    );
  
    return res.rows[0]?.best ?? 0;
  }  

  async getBestStarsForWar(warId: number): Promise<Map<string, number>> {
    const sql = `
      SELECT defender_tag, MAX(stars) AS best
      FROM war_attacks
      WHERE war_id = $1
      GROUP BY defender_tag
    `;
    
    const res = await this.client.query(sql, [warId]);
  
    const map = new Map<string, number>();
    for (const row of res.rows) {
      map.set(row.defender_tag, row.best);
    }
  
    return map;
  }
  
  async getBestAttacksForWar(
    warId: number
  ): Promise<Map<string, { attacker: string; stars: number }>> {
  
    const sql = `
      SELECT wa.defender_tag,
             wa.attacker_tag,
             wa.stars
      FROM war_attacks wa
      JOIN (
          SELECT defender_tag,
                 MAX(stars) AS max_stars
          FROM war_attacks
          WHERE war_id = $1
          GROUP BY defender_tag
      ) best
        ON best.defender_tag = wa.defender_tag
       AND best.max_stars = wa.stars
      WHERE wa.war_id = $1;
    `;
  
    const res = await this.client.query(sql, [warId]);
  
    const map = new Map<
      string,
      { attacker: string; stars: number }
    >();
  
    for (const row of res.rows) {
      map.set(row.defender_tag, {
        attacker: row.attacker_tag,
        stars: row.stars,
      });
    }
  
    return map;
  }
  

  

  async findClansWithoutActiveWar(): Promise<string[]> {
    const sql = `
      SELECT c.tag
      FROM clans c
      LEFT JOIN wars w
        ON w.clan_tag = c.tag
        AND NOW() BETWEEN w.start_time AND w.end_time + INTERVAL '10 minutes'
      WHERE w.id IS NULL
    `;
  
    const res = await this.client.query(sql);
    return res.rows.map((r: { tag: string; }) => r.tag);
  }

  async getWarHeaderForChat(chatId: number): Promise<WarCardHeaderDBO | null> {
    const sql = `
      SELECT
        w.id,
        w.clan_tag,
        c.name AS clan_name,
        w.clan_badge_url,
        w.enemy_clan_tag,
        w.enemy_clan_name,
        w.enemy_clan_badge_url,
        w.start_time,
        w.preparation_start_time,
        w.end_time,
        w.attacks_per_member,
        w.clan_percentage,
        w.clan_stars,
        w.enemy_clan_percentage,
        w.enemy_clan_stars
      FROM wars w
      JOIN clans c ON c.tag = w.clan_tag
      JOIN telegram_links tl ON tl.clan_tag = w.clan_tag
      WHERE tl.telegram_id = $1
        AND w.end_time >= NOW() - INTERVAL '30 minutes'
      ORDER BY w.end_time DESC
      LIMIT 1;
    `;

    const res = await this.client.query(sql, [chatId]);
    if (res.rowCount === 0) return null;
    return res.rows[0] as WarCardHeaderDBO;
  }

  async getWarMembersForWar(warId: number): Promise<WarCardMemberDBO[]> {
    const sql = `
      SELECT
        wm.tag_clan as clan_tag,
        wm.tag,
        wm.name,
        wm.position,
        wm.town_hall_level,
        COALESCE(br.best_stars, 0) AS best_stars_received,
        COALESCE(br.best_destruction, 0) AS best_destruction_received,
        (w.attacks_per_member - COALESCE(af.attacks_done, 0)) AS attacks_left
      FROM war_members wm
      JOIN wars w ON w.id = wm.war_id
      LEFT JOIN (
        SELECT defender_tag, war_id,
               MAX(stars) AS best_stars,
               MAX(destruction_percentage) AS best_destruction
        FROM war_attacks
        WHERE war_id = $1
        GROUP BY war_id, defender_tag
      ) br ON br.defender_tag = wm.tag AND br.war_id = wm.war_id
      LEFT JOIN (
        SELECT attacker_tag, war_id,
               COUNT(*) AS attacks_done
        FROM war_attacks
        WHERE war_id = $1
        GROUP BY war_id, attacker_tag
      ) af ON af.attacker_tag = wm.tag AND af.war_id = wm.war_id
      WHERE wm.war_id = $1
      ORDER BY wm.position ASC;
    `;

    const res = await this.client.query(sql, [warId]);
    return res.rows as WarCardMemberDBO[];
  }
  
  async getClanMembersWithAttacks(warId: number): Promise<WarMemberForPlanningRowDBO[]> {
    const sql = `
      SELECT
        wm.tag AS attacker_tag,
        wm.name AS attacker_name,
        wm.town_hall_level AS attacker_th,
        wm.position AS attacker_position,
  
        def.position AS defender_position,
        def.town_hall_level AS defender_th,
  
        COALESCE(a.stars, 0) AS stars
      FROM war_members wm
      JOIN wars w ON w.id = wm.war_id
  
      LEFT JOIN war_attacks a 
        ON a.war_id = wm.war_id
        AND a.attacker_tag = wm.tag
  
      LEFT JOIN war_members def
        ON def.war_id = wm.war_id
        AND def.tag = a.defender_tag
  
      WHERE wm.war_id = $1
        AND wm.tag_clan = w.clan_tag
  
      ORDER BY wm.position ASC, def.position ASC NULLS LAST;
    `;
  
    const res = await this.client.query(sql, [warId]);
    return res.rows;
  }
    
  async getClanAttacksPosition(warId: number, clan_tag: string): Promise<WarAttackHistoryDBO[]> {
    const sql = `
      SELECT
        wm.name AS attacker_name,
        def.position AS defender_position          
      FROM war_members wm
      INNER JOIN war_attacks a 
        ON a.war_id = wm.war_id
        AND a.attacker_tag = wm.tag  
      LEFT JOIN war_members def
        ON def.war_id = wm.war_id
        AND def.tag = a.defender_tag
      WHERE wm.war_id = $1
        AND wm.tag_clan = $2;
    `;
  
    const res = await this.client.query(sql, [warId, clan_tag]);
    return res.rows;
  }
}