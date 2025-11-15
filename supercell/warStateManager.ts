import { ensureDir } from "https://deno.land/std/fs/ensure_dir.ts";

export interface AttackKey {
    attacker_tag: string;
    defender_tag: string;
    stars: number;
    percentage: number;
    duration: number;
}

interface NotifiedFile {
    notified: AttackKey[];
    timestamp: number;
}

export class WarStateManager {
    private warSnapshots = new Map<number, AttackKey[]>();
    private basePath = "./state";
    private TTL_MS = 9 * 24 * 60 * 60 * 1000;

    constructor() {
        ensureDir(this.basePath);
    }

    private filePath(warId: number) {
        return `${this.basePath}/war_${warId}_notified.json`;
    }

    private isExpired(file: NotifiedFile): boolean {
        return (Date.now() - file.timestamp) > this.TTL_MS;
    }

    async loadNotified(warId: number): Promise<AttackKey[]> {
        const path = this.filePath(warId);
    
        try {
          const txt = await Deno.readTextFile(path);
          const json = JSON.parse(txt) as NotifiedFile;
    
          if (this.isExpired(json)) {
            await Deno.remove(path).catch(() => {});
            return [];
          }
    
          return json.notified;
        } catch {
          return [];
        }
    }

    async saveNotified(warId: number, list: AttackKey[]) {
        const path = this.filePath(warId);
    
        const json: NotifiedFile = {
          notified: list,
          timestamp: Date.now(),
        };
    
        await Deno.writeTextFile(path, JSON.stringify(json, null, 2));
    }

    async processWarUpdate(warId: number, attacks: AttackKey[]): Promise<AttackKey[]> {
        const prevInRam = this.warSnapshots.get(warId) ?? [];
        const previouslyNotified = await this.loadNotified(warId);
    
        const ramNew = attacks.filter((a) =>
          !prevInRam.some(
            (x) =>
              x.attacker_tag === a.attacker_tag &&
              x.defender_tag === a.defender_tag,
          )
        );
    
        const reallyNew = ramNew.filter((a) =>
          !previouslyNotified.some(
            (x) =>
              x.attacker_tag === a.attacker_tag &&
              x.defender_tag === a.defender_tag,
          )
        );
    
        this.warSnapshots.set(warId, attacks);
    
        if (reallyNew.length > 0) {
          const updatedNotified = [...previouslyNotified, ...reallyNew];
          await this.saveNotified(warId, updatedNotified);
        }
    
        return reallyNew;
    }
    
    async clearWar(warId: number) {
        this.warSnapshots.delete(warId);
        try {
          await Deno.remove(this.filePath(warId));
        } catch {
          // ignore
        }
    }
}

