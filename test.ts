import { config } from "https://deno.land/x/dotenv/mod.ts";
import { Repository } from "./supercell/db/repository/repository.ts";
import { HttpClashOfClansClient } from "./supercell/httpClashOfClansClient.ts";
import { log } from "./utility/logger.ts";
const env = config();

const coc = new HttpClashOfClansClient(env.SUPERCELL_KEY!);

const playerTag = "#8RC8RQP2";
const clanTag = "#9CJYGLJC";

const repo = new Repository()
const clan = await coc.getClan(clanTag);

await repo.connect();
if(clan.ok) {
    await repo.clan.insertClan(clan.data);
    await repo.clan.insertClanMembers(clan.data.tag, clan.data.memberList);
}
else {
    log.error(`Errore nel recupero del giocatore: ${clan.error.reason} - ${clan.error.message}`);    
}


const player = await coc.getPlayer(playerTag);
if(player.ok) {
    console.log(`🧙 Player: ${player.data.name} | TH${player.data.townHallLevel} | Trofei ${player.data.trophies}`);
    const clan = await coc.getClan(player.data.clan!.tag);
    if(clan.ok) {
        console.log(clan.data.tag);
        console.log(`🏰 Clan: ${clan.data.name} | Livello ${clan.data.clanLevel} | ${clan.data.members} membri`);
        const war = await coc.getCurrentWar(clan.data.tag);
        console.log("war", war);

    }    
}
else {
    console.error(`Errore nel recupero del giocatore: ${player.error.reason} - ${player.error.message}`);    
}
