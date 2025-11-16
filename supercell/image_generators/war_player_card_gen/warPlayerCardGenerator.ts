import { Browser } from "https://deno.land/x/puppeteer@16.2.0/mod.ts";
import { WarPlayerCardData, WarPlayerGeneratedCard } from "./types.ts";
import { renderWarPlayerCardHTML } from "./template.ts";
import { loadBase64, loadFontBase64, unpackedDate, } from "../../../utility/formatting.ts";
import { log } from "../../../utility/logger.ts";


export class WarPlayerCardGenerator {
  
  private basePath: string;
  private outputDir: string;

  private assets: {
    font: string;
    starFull: string;
    starEmpty: string;
    sword: string;
    townhalls: Record<number, string>;
  } = {
    font: "",
    starFull: "",
    starEmpty: "",
    sword: "",
    townhalls: {},
  };

  private checkCacheEveryGenerations: number = 10;
  private generationCounter: number = 0;

  constructor(options?: { basePath?: string; outputDir?: string }, private browser: Browser | null = null) {
    this.basePath = options?.basePath ?? Deno.cwd();
    this.outputDir = options?.outputDir ?? "/tmp/war_cards";

    // crea cartella di output se non esiste
    Deno.mkdirSync(this.outputDir, { recursive: true });
  }

  public async preloadAssets() {
    log.trace("Preloading assets...");
    
    const fontPath = `${this.basePath}/supercell/image_generators/assets/fonts/Supercell-Magic-Regular.ttf`;
    this.assets.font = loadFontBase64(fontPath);

    const iconsPath = `${this.basePath}/supercell/image_generators/assets/icons`;
    this.assets.starFull = loadBase64(`${iconsPath}/star.png`);
    this.assets.starEmpty = loadBase64(`${iconsPath}/empty_star.png`);
    this.assets.sword = loadBase64(`${iconsPath}/sword.png`);


    const thPath = `${this.basePath}/supercell/image_generators/assets/townhalls`;

    for await (const f of Deno.readDir(thPath)) {
      if (!f.isFile) continue;
      if (!f.name.endsWith(".png")) continue;

      const thNumber = Number(f.name.replace(".png", ""));

      this.assets.townhalls[thNumber] = loadBase64(`${thPath}/${f.name}`);
    }
    
    if (!this.assets.townhalls[1]) {
      throw new Error("Townhall 1 missing. Needed as fallback.");
    }

    log.success("Assets ready.");
  }

  /**
   * Genera tutte le card e ritorna la lista dei path PNG sul disco.
   */
  async generate(players: WarPlayerCardData[]): Promise<WarPlayerGeneratedCard[]> {
    //const browser = await this.initBrowser();
    const page = await this.browser!.newPage();

    // Risoluzione retina consigliata
    await page.setViewport({
      width: 1400,
      height: 460,
      deviceScaleFactor: 2, // => output 2800x920
    });

    const results: WarPlayerGeneratedCard[] = [];
    for (const player of players) {
      const file = `${this.outputDir}/${unpackedDate()}_${this.makeCacheKey(player)}.png`;
      try {
        await Deno.stat(file);
        
        results.push({
          player: player.name,
          position: player.position,
          filePath: file,          
        });
        log.trace(`Cache hit for card ${file}`);  
        continue;
      } catch {
        // Not existing file, go ahead        
      }

      const html = renderWarPlayerCardHTML(
        player, this.assets
      );

      await page.setContent(html, {
        waitUntil: ["load", "domcontentloaded"],
      });                  

      await page.screenshot({ path: file });

      results.push({
        player: player.name,
        position: player.position,        
        filePath: file,
      });
    }

    await page.close();

    log.trace(`Generated ${results.length} war player cards.`);

    this.generationCounter++;
    if (this.generationCounter >= this.checkCacheEveryGenerations) {
      this.generationCounter = 0;
      await this.cleanupOldFiles();
    }    
    return results;
  } 

  private makeCacheKey(data: WarPlayerCardData): string {
    const safeName = data.name.replace(/[^a-z0-9]/gi, "").toLowerCase();
  
    return [
      `pos${data.position}`,
      `name${safeName}`,
      `stars${data.stars}`,
      `atk${data.attacksLeft}`,
      `dst${data.destruction}`,
      `th${data.townhall}`
    ].join("_");
  }

  private async cleanupOldFiles() {
    const today = unpackedDate();
    for await (const f of Deno.readDir(this.outputDir)) {
      if (!f.isFile) continue;
      if (!f.name.endsWith(".png")) continue;
  
      if (!f.name.startsWith(today)) {
        await Deno.remove(`${this.outputDir}/${f.name}`);
      }
    }
  }
    
}