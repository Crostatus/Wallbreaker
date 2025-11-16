import { WarPlayerCardData } from "./types.ts";

/**
 * Ritorna l'HTML finale della card, completamente compatibile con Puppeteer.
 */
export function renderWarPlayerCardHTML(
  data: WarPlayerCardData,  
  assets: any
): string {

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>

  /* FONT SUPERSELL INLINE — FUNZIONA SEMPRE */
  @font-face {
    font-family: 'Clash';
    src: url('${assets.font}') format('truetype');
    font-weight: normal;
    font-style: normal;
  }

  @font-face {
    font-family: 'ClashBold';
    src: url('${assets.font}') format('truetype');
    font-weight: bold;
    font-style: normal;
  }

  body {
    margin: 0;
    padding: 0;
    width: 1400px;
    height: 460px;
    background: transparent;
    font-family: 'Clash';
  }

  .card {
    width: 1400px;
    height: 460px;
    background: #1e1e1e;
    border-radius: 28px;
    display: flex;
    overflow: hidden;
    box-shadow: 0 10px 25px #0008, inset 0 3px 6px #fff1;
    border: 3px solid #000;
  }

  /* LEFT — municipio */
  .left {
    width: 420px;
    background: #000;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .left img {
    height: 100%;
    object-fit: contain;
  }

  /* RIGHT CONTENT */
  .right {
    flex: 1;
    padding: 28px;
    color: white;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  /* TOP ROW */
  .top-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .left-top {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .badge {
    background: #ffcc00;
    padding: 10px 22px;
    border-radius: 14px;
    font-family: 'ClashBold';
    font-size: 34px;
    color: #000;
    box-shadow: inset 0 -4px 0 #b88600, 0 3px 4px #0006;
  }

  .name {
    font-family: 'ClashBold';
    font-size: 50px;
    text-shadow: 3px 3px 0 #000;
  }

  .stars {
    display: flex;
    gap: 8px;
  }

  .stars img {
    width: 60px;
  }

  /* SECOND ROW */
  .attacks-row {
    display: flex;
    gap: 14px;
    margin-bottom: 12px;
  }

  .attacks-row img {
    width: 70px;
  }

  .progress-wrapper {
    margin-top: 12px;
    width: 100%;
  }

  .progress-bar-bg {
    width: 100%;
    height: 38px;
    background: #0009;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: inset 0 4px 6px #000c;
  }

  .progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #ffdd33, #ffb300);
    width: ${data.destruction}%;
    box-shadow: inset 0 -4px 0 #b88600;
  }

  .progress-label {
    margin-top: 8px;
    font-size: 30px;
    font-family: 'ClashBold';
    text-shadow: 2px 2px #000;
  }

</style>
</head>
<body>

<div class="card">

  <!-- LEFT SIDE: TOWNHALL -->
  <div class="left">
    <img src="${assets.townhalls[data.townhall] ?? assets.townhalls['1']}">
  </div>

  <!-- RIGHT -->
  <div class="right">

    <div class="top-row">
      <div class="left-top">
        <div class="badge">#${data.position}</div>
        <div class="name">${data.name}</div>
      </div>

      <div class="stars">
        ${[1,2,3].map(i =>
          `<img src="${i <= data.stars ? assets.starFull : assets.starEmpty}" />`
        ).join("")}
      </div>
    </div>

    <div>
      <div class="attacks-row">
        ${Array.from({ length: data.attacksLeft }).map(() =>
          `<img src="${assets.sword}">`
        ).join("")}
      </div>

      <div class="progress-wrapper">
        <div class="progress-bar-bg">
          <div class="progress-bar"></div>
        </div>
        <div class="progress-label">${data.destruction}% distrutto</div>
      </div>
    </div>

  </div>
</div>

</body>
</html>
  `;
}
