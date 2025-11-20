import { ClashCardGenerator } from './supercell/image_generators/clashCardGenerator.ts';
import { config } from "https://deno.land/x/dotenv/mod.ts";
import { Repository } from "./supercell/db/repository/repository.ts";
import { HttpClashOfClansClient } from "./supercell/httpClashOfClansClient.ts";
import { log } from "./utility/logger.ts";
import { WarPlayerCardGenerator } from "./supercell/image_generators/war_player_card_gen/warPlayerCardGenerator.ts";
import { WarCardData, WarPlayersByClan } from "./supercell/image_generators/war_gen/types.ts";
import { Enemy, Member, WarPlanner } from "./supercell/warPlanner.ts";
const env = config();

function generateClanPlayers(count: number, clanName: string) {
  const players = [];

  for (let i = 1; i <= count; i++) {
    players.push({
      position: i,
      name: `${clanName}-Player${i}`,
      stars: Math.floor(Math.random() * 4),       // 0-3
      attacksLeft: Math.floor(Math.random() * 3), // 0-2
      destruction: Math.floor(Math.random() * 100),
      townhall: 10 + Math.floor(Math.random() * 7), // TH10–TH16
    });
  }

  return players;
}

const members: Member[] = [
  { name: "A1", townHall: 16, position: 1, attacksLeft: 1 },
  { name: "A2", townHall: 15, position: 2, attacksLeft: 1 },
  { name: "A3", townHall: 14, position: 3, attacksLeft: 1 },
  { name: "A4", townHall: 13, position: 4, attacksLeft: 2 },
  { name: "A5", townHall: 12, position: 5, attacksLeft: 2 },
];

const enemies: Enemy[] = [
  { name: "B1", townHall: 16, position: 1, starsDone: 1 },
  { name: "B2", townHall: 15, position: 2, starsDone: 0 },
  { name: "B3", townHall: 14, position: 3, starsDone: 0 },
  { name: "B4", townHall: 13, position: 4, starsDone: 0 },
  { name: "B5", townHall: 12, position: 5, starsDone: 0 },
];

const PreviousAttacks = [
  { attackerName: "A1", defenderPosition: 1 },
  { attackerName: "A2", defenderPosition: 2 },
  { attackerName: "A3", defenderPosition: 3 },
];

const planner = new WarPlanner();

  log.info("🧠 Calcolo piano MILP...");
  const plan = await planner.planWar({
    date: "20251212",
    warId: 1,
    totalAttacksMade: randomInt(0, 1000),
    members,
    enemies,
    attacksHistory: PreviousAttacks,
  }, );

  console.log("📋 RISULTATO:");
  console.table(plan);

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
// const generator: ClashCardGenerator = new ClashCardGenerator();
// await generator.init();
// const cardsClanA = await generator.generateWarCards(generateClanPlayers(20, "MyClan"));

// const cardsClanB = await generator.generateWarCards(generateClanPlayers(20, "EnemyClan"));

// const playersByClan: WarPlayersByClan = {
//   "MyClan": cardsClanA,
//   "EnemyClan": cardsClanB,
// };

// const war: WarCardData = {
//   clanName: "MyClan",
//   opponentClanName: "EnemyClan",
//   preparationStartTime: Date.now().toString(),
//   startTime: Date.now().toString(),
//   endTime: Date.now().toString(),

//   clanStars: 8,
//   opponentClanStars: 6,
//   destruction: 86,
//   opponentDestruction: 72,

//   clanAttacks: 15,
//   opponentClanAttacks: 14,
// };

// generator.generateWarImage(war, playersByClan).then((filePath) => { log.success(`Generated war image at ${filePath}`); })

// const generator = new WarPlayerCardGenerator({
//     basePath: Deno.cwd(),
//   });
//   generator.preloadAssets();
  
//   const cards = await generator.generate([
//     {
//       position: 1,
//       name: "Croccabadughi",
//       stars: 3,
//       attacksLeft: 1,
//       destruction: 98,
//       townhall: 16,
//     },
//     {
//       position: 7,
//       name: "Marco",
//       stars: 1,
//       attacksLeft: 2,
//       destruction: 54,
//       townhall: 15,
//     },
//   ]);
  
//   console.log("Generated cards:", cards);
  
//   await generator.close();
  
// const coc = new HttpClashOfClansClient(env.SUPERCELL_KEY!);

// const playerTag = "#8RC8RQP2";
// const clanTag = "#9CJYGLJC";

// const repo = new Repository()
// const clan = await coc.getClan(clanTag);

// await repo.connect();
// if(clan.ok) {
//     await repo.clan.insertClan(clan.data);
//     await repo.clan.insertClanMembers(clan.data.tag, clan.data.memberList);
// }
// else {
//     log.error(`Errore nel recupero del giocatore: ${clan.error.reason} - ${clan.error.message}`);    
// }


// const player = await coc.getPlayer(playerTag);
// if(player.ok) {
//     console.log(`🧙 Player: ${player.data.name} | TH${player.data.townHallLevel} | Trofei ${player.data.trophies}`);
//     const clan = await coc.getClan(player.data.clan!.tag);
//     if(clan.ok) {
//         console.log(clan.data.tag);
//         console.log(`🏰 Clan: ${clan.data.name} | Livello ${clan.data.clanLevel} | ${clan.data.members} membri`);
//         const war = await coc.getCurrentWar(clan.data.tag);
//         console.log("war", war);

//     }    
// }
// else {
//     console.error(`Errore nel recupero del giocatore: ${player.error.reason} - ${player.error.message}`);    
// }
