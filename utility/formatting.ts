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
      defender_name: string;
      stars: number;
      percentage: number;
      duration: number;
      starsGained: number;
    }>,
  ): string {
    if (attacks.length === 0) return "";
  
    const barClan = percentToBar(summary.clanPercentage);
    const barOpp = percentToBar(summary.oppPercentage);
  
    // ---------- WAR SUMMARY ----------
    const warSummary = `
  \`\`\`
  Clan                  Stars       %
  ------------------------------------------------------
  ${clanName.padEnd(20)}${String(summary.clanStars).padEnd(12)}${barClan}
  ${opponentClanName.padEnd(20)}${String(summary.oppStars).padEnd(12)}${barOpp}
  \`\`\`
  `.trim();
  
    // ---------- MULTI-RIGA ATTACCHI ----------
    const rows = attacks
      .map(a => {
        const bar = percentToBar(a.percentage, 8);
        const gained = a.starsGained > 0 ? ("+" + a.starsGained) : "0";
  
        return (
          a.attacker_name.padEnd(17) +
          a.defender_name.padEnd(18) +
          String(a.stars).padEnd(3) +
          gained.padEnd(5) +          // <-- colonna + più corta
          String(a.duration).padEnd(6) +
          bar
        );
      })
      .join("\n");
  
    const attackTable = `
  \`\`\`
  Attacker          Defender          ⭐  +    Sec   % Bar
  -----------------------------------------------------------------------
  ${rows}
  \`\`\`
  `.trim();
  
    // ---------- MESSAGGIO COMPLETO ----------
    return `
  🔥 *${attacks.length} New Attacks Detected!*
  
  🏆 *War Summary*
  ${warSummary}
  
  ⚔️ *Attack Details*
  ${attackTable}
    `.trim();
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
