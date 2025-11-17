import { Bot } from "https://deno.land/x/grammy/mod.ts";
import { log } from "../utility/logger.ts";
import { formatWarAttackNotification } from "../utility/formatting.ts";
import { HttpClashOfClansClient } from "./httpClashOfClansClient.ts";
import { Repository } from "./db/repository/repository.ts";

export class ClashBot {
  private bot: Bot;  

  constructor(token: string, private coc: HttpClashOfClansClient, private repo: Repository) {
    this.bot = new Bot(token);

    this.bot.command("track", async (ctx) => {
      if(!ctx.message?.text?.trim() || !ctx.message.text.trim().startsWith('#')) {
        ctx.reply("Please provide a valid clan tag to track. Usage: /track <#clan_tag>");
        return;
      }
      const clanTag = ctx.message.text.trim();

      const clan = await this.repo.clan.findClanByTag(clanTag);
      let clanName: string = clan?.name ?? "";      

      if (!clan) {
        const newClanToTrack = await this.coc.getClan(ctx.message.text.trim());
        if(!newClanToTrack.ok) {
          log.warn(`Failed to find clan with tag ${clanTag}: ${newClanToTrack.error.reason}`)
          ctx.reply(`Unable to find clan with tag ${clanTag} 📡`);
          return;
        }
        await this.repo.clan.insertClan(newClanToTrack.data);
        await this.repo.clan.insertClanMembers(newClanToTrack.data.tag, newClanToTrack.data.memberList);
        clanName = newClanToTrack.data.name;                       
      }

      await this.repo.telegram.linkToClan(ctx.chat!.id, clanTag);
      ctx.reply(`Now tracking ${clanName}! 📡`);
    });

    this.bot.command("untrack", async (ctx) => {
      await this.repo.telegram.unLinkClan(ctx.chat!.id);
      ctx.reply(`Stopped clan tracking for this chat 📟`);
    });

    this.bot.command("help", (ctx) => {
      ctx.reply(`There is no help. There is no hope, either. Just you against the void, can you handle it?`);
    });

    this.bot.command("war", (ctx) => {
      
      
    });

    this.bot.catch((err) => {
      log.error(`Telegram bot error: ${err}`);
    });
  }

  start() {
    this.bot.start();
    log.info("🤖 Telegram bot started");
  }

  async notifyNewAttacks(
    telegramChatIds: number[],
    clanName: string,
    opponentClanName: string,
    summary: {
      clanStars: number;
      clanPercentage: number;
      oppStars: number;
      oppPercentage: number;
    },
    attacks: Array<{
      attacker_name: string;
      defender_name: string;
      stars: number;
      percentage: number;
      duration: number;
      starsGained: number;
    }>,
  ) {
    const msg = formatWarAttackNotification(
      clanName,
      opponentClanName,
      summary,
      attacks,
    );
  
    if (!msg) return;
  
    for (const chatId of telegramChatIds) {
      await this.bot.api.sendMessage(chatId, msg, {
        parse_mode: "Markdown",
      });
    }
  }
}
