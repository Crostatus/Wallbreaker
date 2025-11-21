import puppeteer, { Browser } from "https://deno.land/x/puppeteer@16.2.0/mod.ts";
import { WarPlayerCardGenerator } from "./war_player_card_gen/warPlayerCardGenerator.ts";
import { WarPlayerCardData, WarPlayerGeneratedCard } from "./war_player_card_gen/types.ts";
import { WarImageGenerator } from "./war_gen/warImageGenerator.ts";
import { WarCardData, WarPlayersByClan } from "./war_gen/types.ts";



export class ClashCardGenerator {
    private browser: Browser | null = null;
    private lock: Promise<void> = Promise.resolve();
    private unlock: () => void = () => { };

    private warPlayerCard: WarPlayerCardGenerator | null = null;
    private warImg: WarImageGenerator | null = null;
    private basePath: string;
    private cardOutputDir: string;
    private warOutputDir: string;

    constructor(options?: { basePath?: string; cardOutputDir?: string; warOutputDir?: string }) {
        this.basePath = options?.basePath ?? Deno.cwd();
        this.cardOutputDir = options?.cardOutputDir ?? "./output/war_cards";
        this.warOutputDir = options?.warOutputDir ?? "./output/war_imgs";

        Deno.mkdirSync(this.cardOutputDir, { recursive: true });
        Deno.mkdirSync(this.warOutputDir, { recursive: true });
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
        this.warImg = new WarImageGenerator(
            {
                basePath: this.basePath,
                outputDir: this.warOutputDir,
            },
            this.browser!,
        );
        await this.warPlayerCard.preloadAssets();
        this.warImg.preloadAssets();
    }

    private async initBrowser() {
        if (!this.browser) {
            const executablePath = Deno.env.get("PUPPETEER_EXECUTABLE_PATH") ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

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
                    "--disable-dev-shm-usage",
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

    async generateWarCards(players: WarPlayerCardData[]): Promise<WarPlayerGeneratedCard[]> {
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

    async generateWarImage(war: WarCardData, playersByclan: WarPlayersByClan): Promise<string[]> {
        if (!this.warImg) {
            throw new Error("WarImageGenerator not initialized. Call init() first.");
        }

        const release = await this.acquireLock();
        try {
            return await this.warImg.generate(war, playersByclan);
        }
        finally {
            release();
        }
    }
}