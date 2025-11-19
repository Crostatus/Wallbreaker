export function percentToBar(percentage: number, length = 10): string {
    const filled = Math.round((percentage / 100) * length);
    const empty = length - filled;
  
    return "▰".repeat(filled) + "▱".repeat(empty) + ` ${percentage}%`;
}


  
export function formatWarAttackNotification(
    clanName: string,
    opponentClanName: string,
    summary: {
      clanStars: number;
      clanPercentage: number;
      oppStars: number;
      oppPercentage: number;
    },
    attacks: Array<{
      attacker_name: string;
      attacker_position: number;
      defender_name: string;
      defender_position: number;
      stars: number;
      percentage: number;
      duration: number;
      starsGained: number;      
    }>,
  ): string {
    if (attacks.length === 0) return "";
  
    const clanSummaryMessage = [
      `*${clanName}*`,
      `${percentToBar(summary.clanPercentage)}  ${summary.clanStars}⭐`,
      `*${opponentClanName}*`,
      `${percentToBar(summary.oppPercentage)}  ${summary.oppStars}⭐`,
      `-----------------------------------------`,
      ` `,
    ].join("\n");
    
    const rows = attacks.map(a => {      
      const gained = a.starsGained > 0 ? ("+" + a.starsGained) : "0";
      return [
        `${a.attacker_position}. ${a.attacker_name}`,
        `⚔`,
        `${a.defender_position}. ${a.defender_name}`,
        `${percentToBar(a.percentage, 8)} ${`⭐`.repeat(a.stars)}${`✩`.repeat(3 - a.stars)} (${gained})`,        
        `-----------------------------------------`,
      ].join("\n");
    }).join("\n");

  
    return [
      `💣 ${attacks.length} new attacks detected!`,
      clanSummaryMessage,
      rows,
    ].join("\n");
}
  

export function loadFontBase64(path: string): string {
  const bytes = Deno.readFileSync(path);
  let binary = "";

  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }

  const base64 = btoa(binary);

  return `data:font/ttf;base64,${base64}`;
}

export function loadImageBase64(path: string): string {
  try {
    const bytes = Deno.readFileSync(path);
    const base64 = btoa(String.fromCharCode(...bytes));
    // Assumo PNG
    return `data:image/png;base64,${base64}`;
  } catch (_) {
    return ""; 
  }
}

export function loadBase64(path: string): string {
  const bytes = Deno.readFileSync(path);

  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return `data:image/png;base64,${btoa(binary)}`;
}

export function unpackedDateTimeSec(): string {
  const d = new Date();

  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, "0");
  const dd   = String(d.getDate()).padStart(2, "0");
  const hh   = String(d.getHours()).padStart(2, "0");
  const mi   = String(d.getMinutes()).padStart(2, "0");
  const ss   = String(d.getSeconds()).padStart(2, "0");

  return `${yyyy}${mm}${dd}${hh}${mi}${ss}`;
}

export function unpackedDate(): string {
  const d = new Date();

  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, "0");
  const dd   = String(d.getDate()).padStart(2, "0");  

  return `${yyyy}${mm}${dd}`;
}

export function formatWarTimestamp(ts: string): string {
  const n = Number(ts);
  if (isNaN(n)) return ts;

  const d = new Date(n);

  const pad = (v: number) => String(v).padStart(2, "0");

  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
