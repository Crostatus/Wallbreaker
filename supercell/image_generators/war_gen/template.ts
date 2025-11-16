import { formatWarTimestamp } from "../../../utility/formatting.ts";
import { WarPlayerGeneratedCard } from "../war_player_card_gen/types.ts";
import { WarCardData } from "./types.ts";

export function renderWarCardHTML(
    war: WarCardData,
    playersByClan: Record<string, WarPlayerGeneratedCard[]>,
    assets: any
  ): string {
  
    const clanNames = Object.keys(playersByClan);
    const clanA = clanNames[0];
    const clanB = clanNames[1];
  
    const clanAPlayers = playersByClan[clanA] ?? [];
    const clanBPlayers = playersByClan[clanB] ?? [];
  
    // Ordinamento per posizione
    clanAPlayers.sort((a, b) => a.position - b.position);
    clanBPlayers.sort((a, b) => a.position - b.position);
  
    // Larghezza finale dell'immagine:
    // due card larghe 1400px + margini + css scaling
    const WIDTH = 3000;
    const HEADER_HEIGHT = 400;
    const COLUMN_MARGIN = 80;
  
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
      width: ${WIDTH}px;
      background: #111;
      color: white;
      font-family: 'Clash';
    }
  
    .wrapper {
      display: flex;
      flex-direction: column;
      width: 100%;
    }
  
    /* TESTATA */
    .header-small {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      text-align: center;
      margin-top: 20px;
      font-size: 32px;
    }
  
    .header-main {
      margin-top: 20px;
      text-align: center;
      font-family: 'ClashBold';
      font-size: 80px;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 40px;
    }
  
    .header-main img {
      height: 100px;
    }
  
    /* Progress */
    .progress-wrapper {
      margin: 20px auto 0 auto;
      width: 60%;
    }
  
    .progress-bar-bg {
      width: 100%;
      height: 50px;
      background: #0009;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: inset 0 4px 6px #000c;
    }
  
    .progress-bar {
      height: 100%;
      width: ${war.destruction}%;
      background: linear-gradient(90deg, #ffdd33, #ffb300);
    }
  
    .progress-label {
      margin-top: 10px;
      text-align: center;
      font-size: 40px;
      font-family: 'ClashBold';
    }
  
    /* STELLE */
    .stars-row {
      margin-top: 20px;
      text-align: center;
      font-size: 52px;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 18px;
    }
    .stars-row img {
      width: 80px;
    }
  
    /* CONTENITORE DUE COLONNE */
    .columns {
      margin-top: 40px;
      display: flex;
      justify-content: center;
      gap: ${COLUMN_MARGIN}px;
      width: 100%;
    }
  
    .col {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
  
    /* MINI CARD */
    .player-card {
      width: 1400px;
    }
  
  </style>
  </head>
  <body>
  
  <div class="wrapper">
  
    <!-- Header con 3 colonne: prep, start, end -->
    <div class="header-small">
        <div class="date-value">${formatWarTimestamp(war.preparationStartTime)}</div>
        <div class="date-value">${formatWarTimestamp(war.startTime)}</div>
        <div class="date-value">${formatWarTimestamp(war.endTime)}</div>    
    </div>
  
    <!-- Header principale -->
    <div class="header-main">
      <div>${war.clanName}</div>
      <img src="${assets.sword}" />
      <div>${war.opponentClanName}</div>
    </div>
  
    <!-- Barra distruzione -->
    <div class="progress-wrapper">
      <div class="progress-bar-bg"><div class="progress-bar"></div></div>
      <div class="progress-label">${war.destruction}%</div>
    </div>
  
    <!-- Stars -->
    <div class="stars-row">
      <span>${war.clanStars}</span>
      <img src="${assets.starFull}">
      <span>${war.opponentClanStars}</span>
    </div>
  
    <!-- Le due colonne -->
    <div class="columns">
  
      <!-- COLONNA CLAN A -->
      <div class="col">
        ${clanAPlayers.map(p => `
          <img class="player-card" src="${p.filePath}" />
        `).join("")}
      </div>
  
      <!-- COLONNA CLAN B -->
      <div class="col">
        ${clanBPlayers.map(p => `
          <img class="player-card" src="${p.filePath}" />
        `).join("")}
      </div>
  
    </div>
  
  </div>
  
  </body>
  </html>
  `;
  }
  