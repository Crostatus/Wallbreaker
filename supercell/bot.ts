import { ClashCardGenerator } from './image_generators/clashCardGenerator.ts';
import { Bot, CommandContext, Context, InputFile } from "https://deno.land/x/grammy/mod.ts";
import { log } from "../utility/logger.ts";
import { formatWarAttackNotification, formatWarPlanMessage, unpackedDate } from "../utility/formatting.ts";
import { HttpClashOfClansClient } from "./httpClashOfClansClient.ts";
import { Repository } from "./db/repository/repository.ts";
import { WarCardMemberDBO } from "./db/repository/db_models/warDBO.ts";
import { WarPlayersByClan } from "./image_generators/war_gen/types.ts";
import { WarPlanner, WarPlanRow } from "./warPlanner.ts";

export class ClashBot {
  private bot: Bot;
  //private warPlanner = new WarPlanner();

  constructor(token: string, private coc: HttpClashOfClansClient, private repo: Repository, private generator: ClashCardGenerator) {
    this.bot = new Bot(token);

    this.bot.command("track", async (ctx) => {
      const clanTag = this.getCommandArg(ctx?.message?.text);
      if (!clanTag || !clanTag.startsWith('#')) {
        await this.safeReply(ctx, "Please provide a valid clan tag to track. Usage: /track #clan_tag");
        return;
      }
      const loading = await this.safeReply(ctx, "⏳ Fetching clan data...");

      const clan = await this.repo.clan.findClanByTag(clanTag);
      let clanName: string = clan?.name ?? "";

      if (!clan) {
        const newClanToTrack = await this.coc.getClan(clanTag);
        if (!newClanToTrack.ok) {
          log.warn(`Failed to find clan with tag ${clanTag}: ${newClanToTrack.error.reason}`);
          await this.safeTelegramCall(() => ctx.api.deleteMessage(ctx.chat.id, loading.message_id));
          await this.safeReply(ctx, `Unable to find clan with tag ${clanTag} 📡`);
          return;
        }
        await this.repo.clan.insertClan(newClanToTrack.data);
        await this.repo.clan.insertClanMembers(newClanToTrack.data.tag, newClanToTrack.data.memberList);
        clanName = newClanToTrack.data.name;
      }

      await this.repo.telegram.linkToClan(ctx.chat!.id, clanTag);
      await this.safeTelegramCall(() => ctx.api.deleteMessage(ctx.chat.id, loading.message_id));
      await this.safeReply(ctx, `Now tracking ${clanName}! 📡`);
    });

    this.bot.command("suggestwar", async (ctx) => {
      await this.safeReply(ctx, `Work in progress command... ⏳`);
    });

    this.bot.command("untrack", async (ctx) => {
      await this.repo.telegram.unLinkClan(ctx.chat!.id);
      await this.safeReply(ctx, `Stopped clan tracking for this chat 📟`);
    });

    this.bot.command("help", async (ctx) => {
      await this.safeReply(ctx, `There is no help. There is no hope, either. Just you against the void, can you handle it?`);
    });

    this.bot.command("war", async (ctx) => {
      const loading = await this.safeReply(ctx, "⏳ Generating war report...");
      const file = await this.generateWarCard(ctx, false);
      if (file) {
        await this.safeTelegramCall(() => ctx.replyWithPhoto(new InputFile(file)));
      }
      await this.safeTelegramCall(() => ctx.api.deleteMessage(ctx.chat.id, loading.message_id));
    });

    this.bot.command("warleft", async (ctx) => {
      const loading = await this.safeReply(ctx, "⏳ Generating remaining war report...");
      const file = await this.generateWarCard(ctx, true);
      if (file) {
        await this.safeTelegramCall(() => ctx.replyWithPhoto(new InputFile(file)));
      }
      await this.safeTelegramCall(() => ctx.api.deleteMessage(ctx.chat.id, loading.message_id));
    });

    this.bot.catch((err) => {
      log.error(`Telegram bot error: ${err}`);
    });
  }

  // private async generateWarPlan(ctx: CommandContext<Context>): Promise<WarPlanRow[]>{
  //   const chatId = ctx.chat.id;

  //   const warHeader = await this.repo.war.getWarHeaderForChat(chatId);
  //   if (!warHeader) {
  //     await this.safeReply(ctx, "No active war found ⚔️");
  //     return [];
  //   }

  //   const members: WarCardMemberDBO[] = await this.repo.war.getWarMembersForWar(warHeader.id);    
  //   const membersForPlanning = members.filter(m => m.clan_tag!.startsWith(warHeader.clan_tag)).map(m => { return {
  //     name: m.name,
  //     townHall: m.town_hall_level,
  //     position: m.position,
  //     attacksLeft: m.attacks_left, 
  //   }});

  //   const opponentsForPlanning = members.filter(m => m.clan_tag!.startsWith(warHeader.enemy_clan_tag)).map(m => { return {
  //     name: m.name,
  //     townHall: m.town_hall_level,
  //     position: m.position,
  //     starsDone: m.best_stars_received,
  //   }});

  //   const attackHistory = await this.repo.war.getClanAttacksPosition(warHeader.id, warHeader.clan_tag);
  //   if(attackHistory.length === 0) {      
  //     return [];
  //   }

  //   const historyForPlanning = attackHistory.map(a => { return {
  //     attackerName: a.attacker_name,
  //     defenderPosition: a.defender_position,      
  //   }});

  //   return this.warPlanner.planWar({
  //     members: membersForPlanning,
  //     enemies: opponentsForPlanning,      
  //     attacksHistory: historyForPlanning,      
  //   });    
  // }

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
      attacker_position: number;
      defender_name: string;
      defender_position: number;
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

  async safeTelegramCall(fn: () => Promise<any>, maxRetries = 5): Promise<any> {
    let attempt = 0;
    while (true) {
      try {
        return await fn();
      } catch (err: any) {
        if (err.error_code !== 429) throw err;
        attempt++;
        if (attempt > maxRetries) throw err;
        const retryAfter = err.parameters?.retry_after ?? 1;
        await new Promise(res => setTimeout(res, retryAfter * 1000));
      }
    }
  }

  safeReply(ctx: CommandContext<Context>, text: string, opts?: any) {
    return this.safeTelegramCall(() => ctx.reply(text, opts));
  }

  async generateWarCard(ctx: CommandContext<Context>, onlyWhatsLeft: boolean) {
    const chatId = ctx.chat.id;

    log.debug(`Generating war card for chat ${chatId}, onlyWhatsLeft=${onlyWhatsLeft}`);
    const warHeader = await this.repo.war.getWarHeaderForChat(chatId);
    if (!warHeader) {
      await this.safeReply(ctx, "No active war found ⚔️");
      return null;
    }

    const members = await this.repo.war.getWarMembersForWar(warHeader.id);

    const clanPlayersRaw = members.filter((m: any) => m.clan_tag.startsWith(warHeader.clan_tag));
    const enemyPlayersRaw = members.filter((m: any) => m.clan_tag.startsWith(warHeader.enemy_clan_tag));

    const filteredClan = onlyWhatsLeft
      ? clanPlayersRaw.filter((m: any) => m.attacks_left > 0)
      : clanPlayersRaw;

    const filteredEnemy = onlyWhatsLeft
      ? enemyPlayersRaw.filter((m: any) => m.best_stars_received < 3)
      : enemyPlayersRaw;

    const mapPlayer = (m: any) => ({
      position: m.position,
      name: m.name,
      stars: m.best_stars_received,
      attacksLeft: m.attacks_left,
      destruction: m.best_destruction_received,
      townhall: m.town_hall_level,
    });

    const playersByClan: WarPlayersByClan = {};

    const sortedClan = filteredClan.sort((a: WarCardMemberDBO, b: WarCardMemberDBO) => a.position - b.position).map(mapPlayer);
    const sortedEnemy = filteredEnemy.sort((a: WarCardMemberDBO, b: WarCardMemberDBO) => a.position - b.position).map(mapPlayer);

    playersByClan[warHeader.clan_name] = await this.generator.generateWarCards(sortedClan);
    playersByClan[warHeader.enemy_clan_name] = await this.generator.generateWarCards(sortedEnemy);

    const warCardData = {
      clanName: warHeader.clan_name,
      opponentClanName: warHeader.enemy_clan_name,
      preparationStartTime: warHeader.preparation_start_time,
      startTime: warHeader.start_time,
      endTime: warHeader.end_time,
      clanStars: warHeader.clan_stars,
      opponentClanStars: warHeader.enemy_clan_stars,
      destruction: warHeader.clan_percentage,
      opponentDestruction: warHeader.enemy_clan_percentage,
      clanAttacks: 0,
      opponentClanAttacks: 0,
    };

    const filePath = await this.generator.generateWarImage(warCardData, playersByClan);
    return filePath;
  }

  private getCommandArg(fullText: string | null | undefined): string {
    if (!fullText) {
      return "";
    }

    return this.getCommandArgs(fullText)[0] ?? "";
  }

  private getCommandArgs(fullText: string | null | undefined): string[] {
    if (!fullText) {
      return [];
    }

    const parts = fullText?.trim()?.split(" ") ?? [];
    return parts.slice(Math.min(1, parts.length));
  }
}
