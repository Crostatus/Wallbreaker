import { ClashCardGenerator } from './supercell/image_generators/clashCardGenerator.ts';
import { config } from "https://deno.land/x/dotenv/mod.ts";
import { Repository } from "./supercell/db/repository/repository.ts";
import { HttpClashOfClansClient } from "./supercell/httpClashOfClansClient.ts";
import { log } from "./utility/logger.ts";
import { WarPlayerCardGenerator } from "./supercell/image_generators/war_player_card_gen/warPlayerCardGenerator.ts";
import { WarCardData, WarPlayersByClan } from "./supercell/image_generators/war_gen/types.ts";
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

const generator: ClashCardGenerator = new ClashCardGenerator();
await generator.init();
const cardsClanA = await generator.generateWarCards(generateClanPlayers(20, "MyClan"));

const cardsClanB = await generator.generateWarCards(generateClanPlayers(20, "EnemyClan"));

const playersByClan: WarPlayersByClan = {
  "MyClan": cardsClanA,
  "EnemyClan": cardsClanB,
};

const war: WarCardData = {
  clanName: "MyClan",
  opponentClanName: "EnemyClan",
  preparationStartTime: Date.now().toString(),
  startTime: Date.now().toString(),
  endTime: Date.now().toString(),

  clanStars: 8,
  opponentClanStars: 6,
  destruction: 86,
  opponentDestruction: 72,
};

generator.generateWarImage(war, playersByClan).then((filePath) => { log.success(`Generated war image at ${filePath}`); })

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
