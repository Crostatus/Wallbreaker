import { Browser } from "https://deno.land/x/puppeteer@16.2.0/mod.ts";
import { loadBase64, loadFontBase64, unpackedDate, unpackedDateTimeSec } from "../../../utility/formatting.ts";
import { log } from "../../../utility/logger.ts";
import { WarCardData, WarPlayersByClan } from "./types.ts";
import { renderWarCardHTML } from "./template.ts";

export class WarImageGenerator {
  private basePath: string;
  private outputDir: string;

  private assets: {
    font: string;
    starFull: string;
    sword: string;
  } = {
      font: "",
      starFull: "",
      sword: "",
    };

  private checkCacheEveryGenerations: number = 5;
  private generationCounter: number = 0;

  constructor(options?: { basePath?: string; outputDir?: string }, private browser: Browser | null = null) {
    this.basePath = options?.basePath ?? Deno.cwd();
    this.outputDir = options?.outputDir ?? "/tmp/war_images";

    // crea cartella di output se non esiste
    Deno.mkdirSync(this.outputDir, { recursive: true });
  }

  public preloadAssets() {
    log.trace("Preloading assets...");

    const fontPath = `${this.basePath}/supercell/image_generators/assets/fonts/Supercell-Magic-Regular.ttf`;
    this.assets.font = loadFontBase64(fontPath);

    const iconsPath = `${this.basePath}/supercell/image_generators/assets/icons`;
    this.assets.starFull = loadBase64(`${iconsPath}/star.png`);
    this.assets.sword = loadBase64(`${iconsPath}/sword.png`);

    log.success("Assets ready.");
  }

  async generate(war: WarCardData, playersByclan: WarPlayersByClan): Promise<string[]> {
    const clanNames = Object.keys(playersByclan);
    const clanA = clanNames[0];
    const clanB = clanNames[1];

    const allPlayersA = playersByclan[clanA] ?? [];
    const allPlayersB = playersByclan[clanB] ?? [];

    const countA = allPlayersA.length;
    const countB = allPlayersB.length;
    const maxPlayers = Math.max(countA, countB);

    const pageSize = 10;
    const totalPages = Math.max(1, Math.ceil(maxPlayers / pageSize));

    const generatedFiles: string[] = [];

    for (let i = 0; i < totalPages; i++) {
      const start = i * pageSize;
      const end = start + pageSize;

      const sliceA = allPlayersA.slice(start, end);
      const sliceB = allPlayersB.slice(start, end);

      const chunkPlayers: WarPlayersByClan = {
        [clanA]: sliceA,
        [clanB]: sliceB
      };

      const rows = Math.max(sliceA.length, sliceB.length);
      const H_card = 460;
      const H_header = 350;

      const totalHeight = H_header + rows * H_card;
      const totalWidth = 3000;

      // Telegram limit: Width + Height <= 10000
      const maxTotalDimension = 9000;
      const currentTotal = totalWidth + totalHeight;

      let scale = 1;
      if (currentTotal > maxTotalDimension) {
        scale = maxTotalDimension / currentTotal;
        log.info(`Scaling war image page ${i + 1}/${totalPages} by ${scale.toFixed(2)}`);
      }

      const page = await this.browser!.newPage();
      await page.setViewport({
        width: totalWidth,
        height: totalHeight,
        deviceScaleFactor: scale,
      });

      const cacheKey = this.makeCacheKey(war, chunkPlayers, i, totalPages);
      const file = `${this.outputDir}/${unpackedDate()}_${cacheKey}.jpg`;

      let cacheHit = false;
      try {
        await Deno.stat(file);
        log.trace(`Cache hit for card ${file}`);
        cacheHit = true;
      } catch {
        // Not existing file
      }

      if (!cacheHit) {
        const html = renderWarCardHTML(war, chunkPlayers, this.assets);
        await page.setContent(html, { waitUntil: ["load", "domcontentloaded"] });
        await page.screenshot({ path: file, type: "jpeg", quality: 90 });
        log.trace(`Generated war card ${file}`);
      }

      await page.close();
      generatedFiles.push(file);
    }

    this.generationCounter++;
    if (this.generationCounter >= this.checkCacheEveryGenerations) {
      this.generationCounter = 0;
      await this.cleanupOldFiles();
    }
    return generatedFiles;
  }

  private makeCacheKey(data: WarCardData, playersByClan: WarPlayersByClan, pageIndex: number, totalPages: number): string {
    const safeName = data.clanName.replace(/[^a-z0-9]/gi, "").toLowerCase();
    const safeOpponentName = data.opponentClanName.replace(/[^a-z0-9]/gi, "").toLowerCase();

    const clanNames = Object.keys(playersByClan);
    const countA = playersByClan[clanNames[0]]?.length ?? 0;
    const countB = playersByClan[clanNames[1]]?.length ?? 0;

    return [
      `end${unpackedDateTimeSec(new Date(data.endTime))}`,
      `clan${safeName}`,
      `oppo${safeOpponentName}`,
      `dst${data.destruction}`,
      `odst${data.opponentDestruction}`,
      `s${data.clanStars}`,
      `os${data.opponentClanStars}`,
      `a${data.clanAttacks}`,
      `oa${data.opponentClanAttacks}`,
      `p${countA}`,
      `op${countB}`,
      `pg${pageIndex}`,
      `tot${totalPages}`
    ].join("_");
  }

  private async cleanupOldFiles() {
    const today = unpackedDate();
    for await (const f of Deno.readDir(this.outputDir)) {
      if (!f.isFile) continue;
      if (!f.name.endsWith(".jpg")) continue;

      if (!f.name.startsWith(today)) {
        await Deno.remove(`${this.outputDir}/${f.name}`);
      }
    }
  }
}