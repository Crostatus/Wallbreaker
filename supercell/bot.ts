import { Bot } from "https://deno.land/x/grammy/mod.ts";
import { log } from "../utility/logger.ts";

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

  async notifyNewAttack(
    clanName: string,
    opponentClanName: string,
    atk: {      
      attacker_name: string;      
      defender_name: string;
      stars: number;
      percentage: number;
      duration: number;
      starsGained: number;      
    },
  ) {
    const msg = `
    🔥 *New Attack!*

    War: \`${clanName} VS ${opponentClanName}\`

    👤 *Attacker:* ${atk.attacker_name}
    🎯 *Defender:* ${atk.defender_name}

    ⭐ *Stars:* ${atk.stars}
    💥 *Destruction:* ${atk.percentage}%
    ⏱️ *Duration:* ${atk.duration}s

    📈 *Stars gained:* +${atk.starsGained}`;

    log.trace(`Sending attack notification:\n${msg}`);

    for (const chatId of this.admins) {
      await this.bot.api.sendMessage(chatId, msg, {
        parse_mode: "Markdown",
      });
    }
  }
}
