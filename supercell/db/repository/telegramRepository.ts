import pkg from "npm:pg@8.11.3";
import { log } from "../../../utility/logger.ts";
const { Client } = pkg;


export class TelegramRepository {
    private client: InstanceType<typeof Client>;
  
    constructor(client?: InstanceType<typeof Client>) {
      this.client = client;
    }

    public async linkToClan(telegramId: number, clanTag: string) {
        try {
            const sql = `
                INSERT INTO telegram_clan_links (telegram_id, clan_tag)
                VALUES ($1, $2)
                ON CONFLICT (telegram_id) DO UPDATE SET
                    clan_tag = EXCLUDED.clan_tag;
            `;
            const values = [telegramId, clanTag];
            await this.client.query(sql, values);
            log.info(`Linked Telegram ID ${telegramId} to clan ${clanTag}`);
        } catch (error) {
            log.error(`Failed to link Telegram ID ${telegramId} to clan ${clanTag}: ${error}`);            
        }
    }
      
    public async unLinkClan(telegramId: number) {
        try {
            const sql = `
                DELETE FROM telegram_clan_links
                WHERE telegram_id = $1;
            `;
            const values = [telegramId];
            await this.client.query(sql, values);
            log.info(`Unlinked Telegram ID ${telegramId} from clan`);
        } catch (error) {
            log.error(`Failed to unlink Telegram ID ${telegramId} from clan: ${error}`);            
        }
    }

    public async getLinkedChatsForClan(clanTag: string): Promise<number[]> {
        try {
            const sql = `
                SELECT telegram_id
                FROM telegram_clan_links
                WHERE clan_tag = $1;
            `;
            const values = [clanTag];
            const result = await this.client.query(sql, values);
            return result.rows.map((row: { telegram_id: number; }) => row.telegram_id);
        } catch (error) {
            log.error(`Failed to get linked chats for clan ${clanTag}: ${error}`);
            return [];
        }
    }
    
    public async getCurrentWarFromTelegramId(telegramId: number): Promise<null> {
        try {
            const sql = `
                SELECT TOP 1 *
                FROM telegram_clan_links
                INNER JOIN clans ON telegram_clan_links.clan_tag = clans.tag
                INNER JOIN wars ON clans.tag = wars.clan_tag
                WHERE wars.start_time <= NOW()
                  AND NOW() <= wars.end_time + INTERVAL '10 minutes'
                  AND telegram_clan_links.telegram_id = $1; 
                ORDER BY wars.start_time DESC                
            `;
            const values = [telegramId];

            const result = await this.client.query(sql, values);
            return null;
            //return result.rows.map((row: { telegram_id: number; }) => row.telegram_id);
        } catch (error) {
            log.error(`Failed to get war for chat ${telegramId}: ${error}`);
            //return [];
            return null;
        }
    }

}