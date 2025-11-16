import puppeteer, { Browser } from "https://deno.land/x/puppeteer@16.2.0/mod.ts";
import { WarPlayerCardData } from "./types.ts";
import { renderWarPlayerCardHTML } from "./template.ts";
import { loadFontBase64 } from "../../../utility/formatting.ts";

export class WarPlayerCardGenerator {
  private browser: Browser | null = null;
  private basePath: string;
  private outputDir: string;

  constructor(options?: { basePath?: string; outputDir?: string }) {
    this.basePath = options?.basePath ?? Deno.cwd();
    this.outputDir = options?.outputDir ?? "/tmp/war_cards";

    // crea cartella di output se non esiste
    Deno.mkdirSync(this.outputDir, { recursive: true });
  }

  private async initBrowser() {
    if (!this.browser) {
      const executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";//Deno.env.get("PUPPETEER_EXECUTABLE_PATH");

      this.browser = await puppeteer.launch({
        headless: true,
        executablePath,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-gpu",
          "--disable-web-security",
          "--allow-file-access-from-files",
          "--allow-file-access",
          "--enable-local-file-accesses",
          "--allow-cross-origin-auth-prompt",
          "--disable-features=IsolateOrigins,site-per-process",
          "--disable-site-isolation-trials",
          `--user-data-dir=${Deno.cwd()}/.chrome-profile`,
        ],        
      });
    }
    return this.browser;
  }

  /**
   * Genera tutte le card e ritorna la lista dei path PNG sul disco.
   */
  async generate(players: WarPlayerCardData[]): Promise<string[]> {
    const browser = await this.initBrowser();
    const page = await browser.newPage();

    // Risoluzione retina consigliata
    await page.setViewport({
      width: 1400,
      height: 460,
      deviceScaleFactor: 2, // => output 2800x920
    });

    const results: string[] = [];
    for (const player of players) {
      const html = await renderWarPlayerCardHTML(player, this.basePath);
      console.log("=== HTML START ===");
console.log(html);
console.log("=== HTML END ===");

      await page.setContent(html, {
        waitUntil: ["load", "domcontentloaded"],
      });      

      const safeName = player.name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
      const file = `${this.outputDir}/card_rank${player.position}_${safeName}.png`;

      await page.screenshot({ path: file });

      results.push(file);
    }

    await page.close();
    return results;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}