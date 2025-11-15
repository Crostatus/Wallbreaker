const Color = {
    RESET: "\x1b[0m",
    BOLD: "\x1b[1m",
    RED: "\x1b[31m",
    GREEN: "\x1b[32m",
    YELLOW: "\x1b[33m",
    BLUE: "\x1b[34m",
    CYAN: "\x1b[36m",
    MAGENTA: "\x1b[35m",
    GREY: "\x1b[38;5;240m",
    LIGHT_GREY: "\x1b[38;5;250m",
    ORANGE: "\x1b[38;5;208m",
  } as const;
  
  function colorText(text: string, color: string, bold = false): string {
    return `${bold ? Color.BOLD : ""}${color}${text}${Color.RESET}`;
  }
  
  // === LOGGER CLASS ===
  class Logger {
    private debugEnabled: boolean;
    private traceEnabled: boolean;
    private infoEnabled: boolean;
    private timestampEnabled: boolean;
  
    constructor() {
      this.debugEnabled = (Deno.env.get("LOG_DEBUG") ?? "1") === "1";
      this.traceEnabled = (Deno.env.get("LOG_TRACE") ?? "1") === "1";
      this.infoEnabled = (Deno.env.get("LOG_INFO") ?? "1") === "1";
      this.timestampEnabled = (Deno.env.get("LOG_TIMESTAMP") ?? "1") === "1";
    }
  
    private prefix(level: string, color: string, bold = false): string {
      const prefix = colorText(`[${level}]`, color, bold);
      if (this.timestampEnabled) {
        const now = new Date().toLocaleTimeString("it-IT", { hour12: false });
        return `${colorText(now, Color.LIGHT_GREY)} ${prefix}`;
      }
      return prefix;
    }
  
    info(msg: string): void {
      if (this.infoEnabled) {
        console.log(`${this.prefix("INFO", Color.CYAN)}  ${msg}`);
      }
    }
  
    success(msg: string): void {
      console.log(`${this.prefix("OK", Color.GREEN)}    ${msg}`);
    }
  
    warn(msg: string): void {
      console.log(`${this.prefix("WARN", Color.ORANGE)}  ${msg}`);
    }
  
    error(msg: string): void {
      console.error(`${this.prefix("ERROR", Color.RED, true)} ${msg}`);
    }
  
    debug(msg: string): void {
      if (this.debugEnabled) {
        console.log(`${this.prefix("DEBUG", Color.YELLOW)} ${msg}`);
      }
    }
  
    trace(msg: string): void {
      if (this.traceEnabled) {
        console.log(`${this.prefix("TRACE", Color.GREY)} ${colorText(msg, Color.LIGHT_GREY)}`);
      }
    }
  }
  
  export const log = new Logger();
  