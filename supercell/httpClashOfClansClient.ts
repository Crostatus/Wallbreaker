import { log } from "../utility/logger.ts";
import * as SupercellApiModels from "./models/shared.ts";

export interface ResponseError {
  reason: string;
  message: string;
}

export type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: ResponseError };

// ===========================================================================
//  HttpClashOfClansClient con rate limiter globale + coda condivisa
// ===========================================================================

export class HttpClashOfClansClient {
  private static queue: (() => Promise<void>)[] = [];
  private static processing = false;
  private static lastRequestTime = 0;
  private static minDelay = 500; // ms tra chiamate (1.2s)
  private static jobId = 0;

  private readonly maxAttempts = 2;
  private readonly msBeforeReattempt = 1000;
  private readonly msBeforeAbort = 10000;

  private readonly baseUrl: string;
  private readonly token: string;

  constructor(token: string, baseUrl = "https://api.clashofclans.com/v1/") {
    this.baseUrl = baseUrl;
    this.token = token;

    if (!this.token) {
      throw new Error("API token is required");
    }
  }

  // ===========================================================================
  // ⭐ Enqueue con rate-limit globale
  // ===========================================================================

  private static enqueue<T>(task: () => Promise<ApiResponse<T>>): Promise<ApiResponse<T>> {
    const id = ++this.jobId;

    return new Promise((resolve) => {
      this.queue.push(async () => {
        log.debug(`⏳ [${id}] API call enqueued`);

        // Rispettare il rate limit minimo
        const now = Date.now();
        const diff = now - this.lastRequestTime;

        if (diff < this.minDelay) {
          const wait = this.minDelay - diff;
          log.debug(`🕐 [${id}] Rate-limit active → waiting ${wait}ms`);
          await new Promise((r) => setTimeout(r, wait));
        }

        this.lastRequestTime = Date.now();

        log.info(`🚀 [${id}] Executing API call...`);
        const result = await task();

        if (result.ok) {
          log.success(`[${id}]`);
        } else {
          log.error(`[${id}] API error: ${result.error.reason}, message: ${result.error.message}`);
        }

        resolve(result);
      });

      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  private static async processQueue() {
    this.processing = true;

    while (this.queue.length > 0) {
      const job = this.queue.shift()!;
      await job();
    }

    this.processing = false;
  }

  // ===========================================================================  
  //  Utility
  // ===========================================================================

  private encodeTag(tag: string): string {
    return encodeURIComponent(tag.replace(/^#/, ""));
  }

  // ===========================================================================
  //  Richiesta singola (inserita nella coda)
  // ===========================================================================

  private async request<T>(path: string): Promise<ApiResponse<T>> {
    return HttpClashOfClansClient.enqueue<T>(async () => {
      try {
        const fullPath = `${this.baseUrl}${path}`;
        log.debug(`🌐 ${fullPath}`);
        const res = await fetch(fullPath, {
          headers: { Authorization: `Bearer ${this.token}` },
          signal: AbortSignal.timeout(this.msBeforeAbort),
        });

        if (res.ok) {
          const data = await res.json() as T;
          return { ok: true, data };
        }

        const err = await res.json().catch(() => null);
        const error: ResponseError = err ?? {
          reason: `HTTP_${res.status}`,
          message: res.statusText,
        };

        return { ok: false, error };

      } catch (err) {        
        return {
          ok: false,
          error: {
            reason: "NETWORK_ERROR",
            message: err instanceof Error ? err.message : String(err),
          },
        };
      }
    });
  }

  // ===========================================================================
  //  Retry wrapper
  // ===========================================================================

  private async safeRequest<T>(path: string, retries = this.maxAttempts): Promise<ApiResponse<T>> {
    const res = await this.request<T>(path);

    if (!res.ok && retries > 0) {
      log.warn(`🔄 Retry [${path}] (${retries} attempts left)`);
      await new Promise((r) => setTimeout(r, this.msBeforeReattempt));
      return this.safeRequest(path, retries - 1);
    }

    return res;
  }

  // ===========================================================================
  //  Metodi pubblici API
  // ===========================================================================

  public getPlayer(tag: string): Promise<ApiResponse<SupercellApiModels.Player>> {
    return this.safeRequest(`players/%23${this.encodeTag(tag)}`);
  }

  public getClan(tag: string): Promise<ApiResponse<SupercellApiModels.Clan>> {
    return this.safeRequest(`clans/%23${this.encodeTag(tag)}`);
  }

  public getCurrentWar(tag: string): Promise<ApiResponse<SupercellApiModels.ClanWar>> {
    return this.safeRequest(`clans/%23${this.encodeTag(tag)}/currentwar`);
  }
}
