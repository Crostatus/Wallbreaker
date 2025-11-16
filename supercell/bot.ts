import { Bot } from "https://deno.land/x/grammy/mod.ts";
import { log } from "../utility/logger.ts";
import { formatWarAttackNotification, percentToBar } from "../utility/formatting.ts";

export class ClashBot {
  private bot: Bot;
  private admins: string[];

  constructor(token: string, admins: string[]) {
    this.bot = new Bot(token);
    this.admins = admins;

    this.bot.command("start", (ctx) =>
      ctx.reply("👋 Hello! I will notify you about new war attacks")
    );

    this.bot.catch((err) => {
      log.error(`Telegram bot error: ${err}`);
    });
  }

  start() {
    this.bot.start();
    log.info("🤖 Telegram bot started");
  }

  async notifyNewAttacks(
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
  
    // for (const chatId of this.admins) {
    //   await this.bot.api.sendMessage(chatId, msg, {
    //     parse_mode: "Markdown",
    //   });
    // }
  }
}
