import { formatWarTimestamp, loadBase64 } from "../../../utility/formatting.ts";
import { WarPlayerGeneratedCard } from "../war_player_card_gen/types.ts";
import { WarCardData } from "./types.ts";

export function renderWarCardHTML(
  war: WarCardData,
  playersByClan: Record<string, WarPlayerGeneratedCard[]>,
  assets: any
): string {

  const [clanA, clanB] = Object.keys(playersByClan);
  const playersA = [...(playersByClan[clanA] ?? [])].sort((a,b) => a.position - b.position).map(x => ({
    ...x,
    filePath: loadBase64(x.filePath)
  }));
  const playersB = [...(playersByClan[clanB] ?? [])].sort((a,b) => a.position - b.position).map(x => ({
    ...x,
    filePath: loadBase64(x.filePath)
  }));;

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />

<style>

  @font-face {
    font-family: 'Clash';
    src: url('${assets.font}') format('truetype');
  }

  @font-face {
    font-family: 'ClashBold';
    src: url('${assets.font}') format('truetype');
    font-weight: bold;
  }

  body {
    margin: 0;
    padding: 0;
    background: #111;
    color: #fff;
    font-family: 'Clash';
    width: 3000px;
  }

  /* WRAPPER PRINCIPALE */
  .wrapper {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  /* TESTATA 3×3 */
  .header-grid {
    margin-top: 30px;
    width: 90%;
    display: grid;
    grid-template-columns: 1fr 250px 1fr;
    grid-template-rows: auto auto auto;
    gap: 10px 20px;
    align-items: center;
    justify-items: center;
  }

  /* NOMI CLAN */
  .clan-name {
    font-family: 'ClashBold';
    font-size: 70px;
    text-shadow: 4px 4px 0 #000;
  }
  .clan-left { justify-self: end; }
  .clan-right { justify-self: start; }

  /* SPADA CENTRALE */
  .sword-center img {
    height: 130px;
  }

  /* PROGRESS BAR */
  .progress {
    width: 100%;
    max-width: 900px;
  }

  .progress-bar-bg {
    width: 100%;
    height: 55px;
    background: #0009;
    border-radius: 20px;
    overflow: hidden;
    box-shadow: inset 0 4px 6px #000c;
  }

  .progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #ffdd33, #ffb300);
  }

  .percent {
    font-family: 'ClashBold';
    font-size: 38px;
    margin-top: 6px;
    text-shadow: 2px 2px #000;
  }

  /* STELLE RIGA 3 */
  .stars {
    font-family: 'ClashBold';
    font-size: 60px;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .stars img {
    width: 80px;
  }

  /* COLONNE PLAYERS */
  .columns {
    margin-top: 40px;
    width: 95%;
    display: flex;
    justify-content: center;
    gap: 80px;
  }

  .col {
    display: flex;
    flex-direction: column;
    gap: 25px;
  }

  .player-card {
    width: 1400px;
  }

  /* DATE HEADER (sopra tutto) */
  .dates {
    margin-bottom: 20px;
    width: 90%;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    text-align: center;
    font-size: 32px;
  }

</style>
</head>

<body>
<div class="wrapper">

  <!-- DATE -->
  <div class="dates">
    <div>${formatWarTimestamp(war.preparationStartTime)}</div>
    <div>${formatWarTimestamp(war.startTime)}</div>
    <div>${formatWarTimestamp(war.endTime)}</div>
  </div>

  <!-- GRID 3×3 -->
  <div class="header-grid">

    <!-- RIGA 1 -->
    <div class="clan-name clan-left">${war.clanName}</div>
    <div class="sword-center"><img src="${assets.sword}" /></div>
    <div class="clan-name clan-right">${war.opponentClanName}</div>

    <!-- RIGA 2 -->
    <div class="progress clan-left">
      <div class="progress-bar-bg">
        <div class="progress-bar" style="width:${war.destruction}%"></div>
      </div>
      <div class="percent">${war.destruction}%</div>
    </div>

    <div></div>

    <div class="progress clan-right">
      <div class="progress-bar-bg">
        <div class="progress-bar" style="width:${war.opponentDestruction}%"></div>
      </div>
      <div class="percent" style="text-align: right">${war.opponentDestruction}%</div>
    </div>

    <!-- RIGA 3 -->
    <div class="stars clan-left">
      ${war.clanStars}
    </div>

    <div class="stars">
      <img src="${assets.starFull}" />
    </div>

    <div class="stars clan-right">
      ${war.opponentClanStars}
    </div>

  </div>


  <!-- COLONNE GIOCATORI -->
  <div class="columns">

    <div class="col">
      ${playersA.map(p => `<img class="player-card" src="${p.filePath}" />`).join("")}
    </div>

    <div class="col">
      ${playersB.map(p => `<img class="player-card" src="${p.filePath}" />`).join("")}
    </div>

  </div>

</div>
</body>
</html>
`;
}
