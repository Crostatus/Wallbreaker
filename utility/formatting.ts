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
  