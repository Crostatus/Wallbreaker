import { Browser } from "https://deno.land/x/puppeteer@16.2.0/mod.ts";
import { loadBase64, loadFontBase64, unpackedDate } from "../../../utility/formatting.ts";
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

    async generate(war: WarCardData, playersByclan: WarPlayersByClan): Promise<string> {
        //const browser = await this.initBrowser();
        const clanNames = Object.keys(playersByclan);
        const page = await this.browser!.newPage();
    
        const rows = Math.ceil(clanNames[0].length / 2);
        const H_card = 460;
        const H_header = 350;

        const totalHeight = H_header + rows * H_card;

        // Risoluzione retina consigliata
        await page.setViewport({
          width: 3000,
          height: totalHeight,
          deviceScaleFactor: 1, // => output 2800x920
        });    
            
        const file = `${this.outputDir}/${unpackedDate()}_${this.makeCacheKey(war)}.png`;
        try {
            await Deno.stat(file);

            log.trace(`Cache hit for card ${file}`);  
            return file;
            
        } catch {
            // Not existing file, go ahead        
        }
    
        const html = renderWarCardHTML(
            war, playersByclan, this.assets
        );
    
        await page.setContent(html, {
            waitUntil: ["load", "domcontentloaded"],
        });                  
    
        await page.screenshot({ path: file });            
        await page.close();
    
        log.trace(`Generated war card ${file}`);
    
        this.generationCounter++;
        if (this.generationCounter >= this.checkCacheEveryGenerations) {
          this.generationCounter = 0;
          await this.cleanupOldFiles();
        }    
        return file;
      }
    
    private makeCacheKey(data: WarCardData): string {
        const safeName = data.clanName.replace(/[^a-z0-9]/gi, "").toLowerCase();
        const safeOpponentName = data.opponentClanName.replace(/[^a-z0-9]/gi, "").toLowerCase();

        return [          
          `end${data.endTime}`,
          `clan${safeName}`,
          `oppo${safeOpponentName}`,
          `dst${data.destruction}`,
          `odst${data.opponentDestruction}`,
          `s${data.clanStars}`,
          `os${data.opponentClanStars}`,
          `a${data.clanAttacks}`,
          `oa${data.opponentClanAttacks}`,
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