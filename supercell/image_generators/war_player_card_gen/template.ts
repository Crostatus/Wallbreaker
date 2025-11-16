import { WarPlayerCardData } from "./types.ts";

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

  /* FONT SUPERCELL INLINE */
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
    border: 8px solid #000;
  }

  /* LEFT */
  .left {
    width: 420px;
    background: #1e1e1e;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .left img {
    height: 100%;
    object-fit: contain;
    background: #1e1e1e;
  }

  /* RIGHT */
  .right {
    flex: 1;
    padding: 28px;
    color: white;
    display: flex;
    flex-direction: column;
    gap: 26px;
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
    gap: 12px;
    align-items: center;
  }

  .stars img {
    width: 110px;
  }

  /* DEST RU */
  .dest-row {
    display: flex;
    align-items: center;
    gap: 18px;
    margin-top: -6px;
  }

  .progress-bar-bg {
    height: 32px;
    width: 420px;
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

  .percent-label {
    font-family: 'ClashBold';
    font-size: 36px;
    text-shadow: 2px 2px #000;
  }

  /* ATTACCHI */
  .attacks-row {
    display: flex;
    gap: 20px;
    margin-top: 14px;
  }

  .attacks-row img {
    width: 180px;
  }

</style>
</head>
<body>

<div class="card">

  <!-- LEFT SIDE: TOWNHALL -->
  <div class="left">
    <img src="${assets.townhalls[data.townhall] ?? assets.townhalls['1']}">
  </div>

  <!-- RIGHT SIDE -->
  <div class="right">

    <!-- TOP ROW -->
    <div class="top-row">

      <!-- badge + name -->
      <div class="left-block">
        <div class="left-top">
          <div class="badge">#${data.position}</div>
          <div class="name">${data.name}</div>
        </div>
      </div>

      <!-- stelle -->
      <div class="stars">
        ${[1,2,3].map(i =>
          `<img src="${i <= data.stars ? assets.starFull : assets.starEmpty}">`
        ).join("")}
      </div>

    </div>

    <!-- BARRA DISTRUZIONE SOTTO IL NOME -->
    

  <!-- BARRA DISTRUZIONE SOTTO IL NOME -->
  <div class="dest-row" style="${data.stars === 3 ? 'visibility:hidden;' : ''}">
    <div class="progress-bar-bg">
      <div class="progress-bar" style="width:${data.destruction}%"></div>
    </div>
    <div class="percent-label">${data.destruction}%</div>
  </div>

    

    <!-- SPADINE -->
    <div class="attacks-row">
      ${Array.from({ length: data.attacksLeft }).map(() =>
        `<img src="${assets.sword}">`
      ).join("")}
    </div>

  </div>
</div>

</body>
</html>
`;
}
