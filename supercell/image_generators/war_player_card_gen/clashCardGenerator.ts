import puppeteer, { Browser } from "https://deno.land/x/puppeteer@16.2.0/mod.ts";
import { WarPlayerCardGenerator } from "./warPlayerCardGenerator.ts";
import { WarPlayerCardData } from "./types.ts";


export class ClashCardGenerator {
    private browser: Browser | null = null;
    private lock: Promise<void> = Promise.resolve();
    private unlock: () => void = () => {};
    
    private warPlayerCard: WarPlayerCardGenerator | null = null;
    private basePath: string;
    private cardOutputDir: string;

    constructor(options?: { basePath?: string; cardOutputDir?: string }) {
        this.basePath = options?.basePath ?? Deno.cwd();
        this.cardOutputDir = options?.cardOutputDir ?? "./output/war_cards";

        Deno.mkdirSync(this.cardOutputDir, { recursive: true });    
    }

    public async init() {
        await this.initBrowser();
        this.warPlayerCard = new WarPlayerCardGenerator(
            {
                basePath: this.basePath,
                outputDir: this.cardOutputDir,
            },
            this.browser!,
        );
        await this.warPlayerCard.preloadAssets();
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

    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }

    private async acquireLock() {        
        const nextLock = new Promise<void>((resolve) => {
          this.unlock = resolve;
        });      
        
        const previous = this.lock;
        this.lock = nextLock;
              
        await previous;
            
        return () => {      
          this.unlock();
        };
    }

    async generateWarCards(players: WarPlayerCardData[]): Promise<string[]> {
        if (!this.warPlayerCard) {
            throw new Error("WarPlayerCardGenerator not initialized. Call init() first.");
        }

        const release = await this.acquireLock();
        try {
            return await this.warPlayerCard.generate(players);
        }
        finally {
            release();
        }
    }
}