import { ClanDBO, ClanMemberDBO } from './db_models/clanDBO.ts';
import pkg from "npm:pg@8.11.3";
const { Client } = pkg;
import { Clan, ClanMember } from "../../models/shared.ts";
import { log } from "../../../utility/logger.ts";


function asClanDBO(toParse: Clan): ClanDBO {
  return {
    tag: toParse.tag,
    name: toParse.name,
    description: toParse.description,
    badgeUrl: toParse.badgeUrls.large,
    clanLevel: toParse.clanLevel,
    requiredTrophies: toParse.requiredTrophies,
    requiredBuilderBaseTrophies: toParse.requiredBuilderBaseTrophies,
    requiredTownhallLevel: toParse.requiredTownhallLevel,
    warWinStreak: toParse.warWinStreak,
    warWins: toParse.warWins,
    warTies: toParse.warTies,
    warLosses: toParse.warLosses,    
  };
}

function asClanMemberDBO(clanTag: string, toParse: ClanMember): ClanMemberDBO {
  return {
    tag: toParse.tag,
    tagClan: clanTag,
    name: toParse.name,
    townHallLevel: toParse.townHallLevel,
    expLevel: toParse.expLevel,
    leagueTier: toParse.leagueTier?.iconUrls.large || "",
    trophies: toParse.trophies,
    builderBaseTrophies: toParse.builderBaseTrophies,
    donations: toParse.donations,
    donationsReceived: toParse.donationsReceived,
  };
}

export class ClanRepository {
  private client: InstanceType<typeof Client>;

  constructor(client?: InstanceType<typeof Client>) {
    this.client = client;
  }

  async insertClan(clanToInsert: Clan) {
    const query = `
      INSERT INTO clans (
        tag, name, description, badge_url, clan_level,
        required_trophies, required_builder_base_trophies,
        required_townhall_level, war_win_streak, war_wins,
        war_ties, war_losses
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12
      )
      ON CONFLICT (tag) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        badge_url = EXCLUDED.badge_url,
        clan_level = EXCLUDED.clan_level,
        required_trophies = EXCLUDED.required_trophies,
        required_builder_base_trophies = EXCLUDED.required_builder_base_trophies,
        required_townhall_level = EXCLUDED.required_townhall_level,
        war_win_streak = EXCLUDED.war_win_streak,
        war_wins = EXCLUDED.war_wins,
        war_ties = EXCLUDED.war_ties,
        war_losses = EXCLUDED.war_losses,
        updated_at = NOW();
    `;

    const clan = asClanDBO(clanToInsert);
    const values = [
      clan.tag,
      clan.name,
      clan.description,
      clan.badgeUrl,
      clan.clanLevel,
      clan.requiredTrophies,
      clan.requiredBuilderBaseTrophies,
      clan.requiredTownhallLevel,
      clan.warWinStreak,
      clan.warWins,
      clan.warTies,
      clan.warLosses,      
    ];

    await this.client.query(query, values);
    log.success(`Clan ${clan.tag} '${clan.name}' stored`);
  }

  async insertClanMembers(tagClan: string, members: ClanMember[]) {
    await this.client.query("BEGIN");
    try {
      const newTags = members.map(m => m.tag);
        
      const deleteSql = `
        DELETE FROM clan_members
        WHERE tag_clan = $1
        AND tag NOT IN (${newTags.map((_, i) => `$${i + 2}`).join(",")});
      `;
      await this.client.query(deleteSql, [tagClan, ...newTags]);
  
      
      if (members.length > 0) {
        const dbos = members.map(m => asClanMemberDBO(tagClan, m));
  
        // valori appiattiti
        const values: any[] = [];
        for (const dbo of dbos) {
          values.push(
            dbo.tag,
            dbo.tagClan,
            dbo.name,
            dbo.townHallLevel,
            dbo.expLevel,
            dbo.leagueTier,
            dbo.trophies,
            dbo.builderBaseTrophies,
            dbo.donations,
            dbo.donationsReceived,
          );
        }
          
        const rowPlaceholders = dbos
          .map((_, i) => {
            const offset = i * 10;
            return `(${Array.from({ length: 10 }, (_, j) => `$${offset + j + 1}`).join(",")})`;
          })
          .join(",");
  
        const upsertSql = `
          INSERT INTO clan_members (
            tag, tag_clan, name, town_hall_level, exp_level,
            league_tier_url, trophies, builder_base_trophies,
            donations, donations_received
          )
          VALUES ${rowPlaceholders}
          ON CONFLICT (tag) DO UPDATE SET
            tag_clan = EXCLUDED.tag_clan,
            name = EXCLUDED.name,
            town_hall_level = EXCLUDED.town_hall_level,
            exp_level = EXCLUDED.exp_level,
            league_tier_url = EXCLUDED.league_tier_url,
            trophies = EXCLUDED.trophies,
            builder_base_trophies = EXCLUDED.builder_base_trophies,
            donations = 
            CASE 
              WHEN EXCLUDED.donations >= clan_members.raw_donations 
                THEN clan_members.donations + (EXCLUDED.donations - clan_members.raw_donations)
              ELSE 
                clan_members.donations + EXCLUDED.donations
            END,
            donations_received = 
              CASE 
                WHEN EXCLUDED.donations_received >= clan_members.raw_donations_received 
                  THEN clan_members.donations_received + (EXCLUDED.donations_received - clan_members.raw_donations_received)
                ELSE 
                  clan_members.donations_received + EXCLUDED.donations_received
              END,
            raw_donations = EXCLUDED.donations,
            raw_donations_received = EXCLUDED.donations_received;
        `;
  
        await this.client.query(upsertSql, values);
      }
      await this.client.query("COMMIT");

      log.success(`${members.length} clan members stored into clan ${tagClan}`);
    } catch (err) {
      await this.client.query("ROLLBACK");      
      throw err;
    }
  }

  async findClanByTag(tag: string): Promise<ClanDBO | null> {
    const res = await this.client.query("SELECT * FROM clans WHERE tag = $1", [tag]);
    if (res.rows.length === 0) return null;

    const row = res.rows[0];
    return {
      tag: row.tag,
      name: row.name,
      description: row.description,
      badgeUrl: row.badge_url,
      clanLevel: row.clan_level,
      requiredTrophies: row.required_trophies,
      requiredBuilderBaseTrophies: row.required_builder_base_trophies,
      requiredTownhallLevel: row.required_townhall_level,
      warWinStreak: row.war_win_streak,
      warWins: row.war_wins,
      warTies: row.war_ties,
      warLosses: row.war_losses,
      updatedAt: row.updated_at,
    } as ClanDBO;
  }

  async delete(tag: string) {
    await this.client.query("DELETE FROM clans WHERE tag = $1", [tag]);
  }

  async findOutdatedClans(staleHours: number): Promise<ClanDBO[]> {
    const sql = `
      SELECT c.*
      FROM clans c
      WHERE c.updated_at < NOW() - INTERVAL '${staleHours} hours'
        AND NOT EXISTS (
          SELECT 1
          FROM wars w
          WHERE w.clan_tag = c.tag
            AND w.end_time > NOW()           -- war still active
        )
    `;
  
    const res = await this.client.query(sql);
    return res.rows as ClanDBO[];
  }  
}
