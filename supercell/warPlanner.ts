// WarPlanner.ts - versione senza cache, con prevenzione repeat-attack
// e primo attacco sempre assegnato al target più vicino possibile.
//
// Richiede: glpk.js (npm)
//   npm install glpk.js
//
// Esecuzione con Deno (esempio):
//   deno run --allow-read --allow-env --allow-net main.ts
//
// Assicurati di avere un deno.json con:
// {
//   "compilerOptions": { "module": "esnext" },
//   "nodeModulesDir": "auto"
// }

// Usa glpk.js via npm in Deno
// @deno-types="npm:glpk.js"
import GLPKFactory from "npm:glpk.js";
import { log } from "../utility/logger.ts";

// ---- TIPI DI DOMINIO -------------------------------------------------------

export interface Member {
  name: string;
  townHall: number;    // municipio
  position: number;    // 1 = più forte
  attacksLeft: number; // 0, 1 o 2 tipicamente
}

export interface Enemy {
  name: string;
  townHall: number;
  position: number;    // 1 = più forte
  starsDone: number;   // 0..3
}

export interface WarPlanRow {
  playerName: string;
  position: number;
  attack1Position: number | null; // posizione target del primo attacco (se presente)
  attack2Position: number | null; // posizione target del secondo attacco (se presente)
}

// Attacchi già effettuati nella war
export interface PreviousAttack {
  attackerName: string;
  defenderPosition: number; // posizione del nemico attaccato
}

// Slot = singolo "attacco" disponibile di un player
interface Slot {
  id: number;              // id slot interno (univoco)
  ownerName: string;       // nome player
  ownerPosition: number;   // posizione player
  ownerIndex: number;      // indice nella lista members
  townHall: number;
}

// Alias GLPK (dal factory glpk.js)
type GLPK = any;

// ---- CLASSE PRINCIPALE -----------------------------------------------------

export class WarPlanner {
  private glpkPromise: GLPK;

  constructor() {
    this.glpkPromise = GLPKFactory();
  }

  // ============ API PUBBLICA ===============================================

  /**
   * Pianifica la war usando MILP.
   *
   * Identificatore war: date(YYYYMMDD), warId, totalAttacksMade
   * (ora usati solo come metadata, non per la cache)
   *
   * Restituisce lista di righe:
   *   <playerName, position, attack1Position, attack2Position>
   *
   * attacksHistory:
   *   elenco degli attacchi già effettuati (attackerName, defenderPosition),
   *   usato per evitare che un player venga assegnato di nuovo alla stessa base.
   */
  public async planWar(params: {     
    members: Member[];
    enemies: Enemy[];
    attacksHistory?: PreviousAttack[];
  }): Promise<WarPlanRow[]> {
    const {
      members,
      enemies,
      attacksHistory = [],
    } = params;

    if (members.length === 0 || enemies.length === 0) {
      return [];
    }

    const glpk = await this.glpkPromise;

    // Costruisci mappa: attackerName -> Set<defenderPosition>
    const attackedMap = new Map<string, Set<number>>();
    for (const atk of attacksHistory) {
      if (!attackedMap.has(atk.attackerName)) {
        attackedMap.set(atk.attackerName, new Set<number>());
      }
      attackedMap.get(atk.attackerName)!.add(atk.defenderPosition);
    }

    const plan = await this.solveMilp(glpk, members, enemies, attackedMap);

    return plan;
  }

  // ============ MILP CORE ===================================================

  private computeProbability(
    attackerPos: number,
    defenderPos: number,
    attackerTH: number,
    defenderTH: number,
  ): number {
    const dPos = defenderPos - attackerPos;
    const dTH  = defenderTH - attackerTH;
  
    // punto base per TH pari, stessa posizione
    let base = 0.60;
  
    //
    // 1) Effetto MUNICIPIO — molto forte
    //
    if (dTH > 0) {
      // ogni TH sopra toglie tantissimo
      base -= 0.50 * dTH;     // +1 TH → -0.50, +2 TH → -1.00, +3 → -1.50...
    } else if (dTH < 0) {
      // TH sotto aiuta ma non troppo
      base += 0.10 * (-dTH);
    }
  
    //
    // 2) Effetto POSIZIONE — debole
    //
    base += 0.04 * dPos;
  
    // penalità extra per grossi salti in posizione
    // const extraPos = Math.max(0, Math.abs(dPos) - 1);
    // base -= 0.02 * extraPos;
  
    //
    // 3) Limiti — p minima molto bassa
    //
    // if (base < 0.005) base = 0.005;   // 0.5% → quasi zero ma permette la distinzione
    // if (base > 0.95) base = 0.95;
    // if (base < 0.0) base = 0.0;
    // if (base > 0.95) base = 0.95;
    
    
    return base;
  }

  private expectedStarsFromProb(p: number): number {
    return 3 * p;
  }

  // Costruisce i "slot" (uno per ogni attacco disponibile)
  private buildSlots(members: Member[]): Slot[] {
    const slots: Slot[] = [];
    let idCounter = 0;

    members.forEach((m, memberIndex) => {
      for (let k = 0; k < m.attacksLeft; k++) {
        slots.push({
          id: idCounter++,
          ownerName: m.name,
          ownerIndex: memberIndex,
          ownerPosition: m.position,
          townHall: m.townHall,
        });
      }
    });

    return slots;
  }

  // MILP: costruzione modello + solve
  private async solveMilp(
    glpk: GLPK,
    members: Member[],
    enemies: Enemy[],
    attackedMap: Map<string, Set<number>>,
  ): Promise<WarPlanRow[]> {
    const slots = this.buildSlots(members);

    // Se nessuno ha attacchi, ritorna solo righe vuote
    if (slots.length === 0) {
      return members
        .map((m) => ({
          playerName: m.name,
          position: m.position,
          attack1Position: null,
          attack2Position: null,
        }))
        .sort((a, b) => a.position - b.position);
    }

    // Prepara cap e valori attesi E[slotId][enemyIndex]
    const cap: number[] = enemies.map((e) => Math.max(0, 3 - e.starsDone));
    const E: number[][] = []; // E[slotId][enemyIndex]

    for (const s of slots) {
      const row: number[] = [];
      const prevAttacks = attackedMap.get(s.ownerName);

      for (const e of enemies) {
        const idx = e.position - 1; // assumiamo pos = 1..N
        // Se la base è full (cap 0) o il player l'ha già attaccata, aspettativa 0
        const alreadyAttacked = prevAttacks?.has(e.position) ?? false;

        if (cap[idx] <= 0 || alreadyAttacked) {
          row.push(0);
        } else {
          const p = this.computeProbability(
            s.ownerPosition,
            e.position,
            s.townHall,
            e.townHall,
          );
          row.push(this.expectedStarsFromProb(p));
        }
      }
      E[s.id] = row;
    }

    // ==== COSTRUZIONE MODELLO GLPK =========================================

    const varNamesX: string[] = [];
    const varNamesY: string[] = [];
    const varNamesZ: string[] = [];

    // Nome x_s_e: x_s{slotId}_e{enemyIndex}
    const xName = (slotId: number, enemyIndex: number) =>
      `x_s${slotId}_e${enemyIndex}`;
    // Nome y_p_e: y_p{playerIndex}_e{enemyIndex}
    const yName = (playerIndex: number, enemyIndex: number) =>
      `y_p${playerIndex}_e${enemyIndex}`;
    // Nome z_e: z_e{enemyIndex}
    const zName = (enemyIndex: number) => `z_e${enemyIndex}`;

    // Objective vars
    const objectiveVars: { name: string; coef: number }[] = [];
    const lambda = 1e-4;

    // z_j con coefficiente 1
    enemies.forEach((_, eIndex) => {
      const name = zName(eIndex);
      varNamesZ.push(name);
      objectiveVars.push({ name, coef: 1.0 });
    });

    // x_sj con coefficiente -lambda (penalità di affollamento)
    slots.forEach((s) => {
      enemies.forEach((_, eIndex) => {
        const name = xName(s.id, eIndex);
        varNamesX.push(name);
        objectiveVars.push({ name, coef: -lambda });
      });
    });

    // y_ij (nessun contributo diretto all'obiettivo, ma binarie)
    members.forEach((m, pIndex) => {
      if (m.attacksLeft === 0) return; // i player senza attacchi non hanno y
      enemies.forEach((_, eIndex) => {
        const name = yName(pIndex, eIndex);
        varNamesY.push(name);
        // coefficiente 0 nell'obiettivo
        objectiveVars.push({ name, coef: 0.0 });
      });
    });

    const subjectTo: {
      name: string;
      vars: { name: string; coef: number }[];
      bnds: { type: number; ub: number; lb: number };
    }[] = [];

    // 1) Ogni slot deve attaccare esattamente una base: somma_j x_sj = 1
    for (const s of slots) {
      const vars = enemies.map((_, eIndex) => ({
        name: xName(s.id, eIndex),
        coef: 1.0,
      }));
      subjectTo.push({
        name: `slot_${s.id}_assign`,
        vars,
        bnds: { type: glpk.GLP_FX, lb: 1.0, ub: 1.0 },
      });
    }

    // 2) Cap stelle per base: z_j <= cap_j  e  z_j <= ∑_s E_sj x_sj
    enemies.forEach((enemy, eIndex) => {
      const zj = zName(eIndex);
      const capj = cap[enemy.position - 1];

      // z_j <= cap_j
      subjectTo.push({
        name: `cap1_e${eIndex}`,
        vars: [{ name: zj, coef: 1.0 }],
        bnds: {
          type: glpk.GLP_UP,
          lb: 0.0,
          ub: capj,
        },
      });

      // z_j - ∑_s E_sj x_sj <= 0
      const vars: { name: string; coef: number }[] = [];
      vars.push({ name: zj, coef: 1.0 });
      for (const s of slots) {
        const coef = -E[s.id][eIndex];
        if (coef !== 0) {
          vars.push({ name: xName(s.id, eIndex), coef });
        }
      }

      subjectTo.push({
        name: `cap2_e${eIndex}`,
        vars,
        bnds: {
          type: glpk.GLP_UP,
          lb: Number.NEGATIVE_INFINITY,
          ub: 0.0,
        },
      });
    });

    // 3) Collegamento y_ij >= x_sj per gli slot di quel player
    members.forEach((m, pIndex) => {
      if (m.attacksLeft === 0) return;

      const playerSlots = slots.filter((s) => s.ownerIndex === pIndex);

      enemies.forEach((_, eIndex) => {
        const yVar = yName(pIndex, eIndex);
        for (const s of playerSlots) {
          // y_ij - x_sj >= 0
          subjectTo.push({
            name: `link_y_p${pIndex}_s${s.id}_e${eIndex}`,
            vars: [
              { name: yVar, coef: 1.0 },
              { name: xName(s.id, eIndex), coef: -1.0 },
            ],
            bnds: {
              type: glpk.GLP_LO, // left >= lb
              lb: 0.0,
              ub: 0.0, // ub ignorato per LO
            },
          });
        }
      });
    });

    // 4) Vincolo: lo stesso player non può attaccare due volte la stessa base
    members.forEach((m, pIndex) => {
      if (m.attacksLeft === 0) return;

      const playerSlots = slots.filter((s) => s.ownerIndex === pIndex);

      enemies.forEach((_, eIndex) => {
        const vars = playerSlots.map((s) => ({
          name: xName(s.id, eIndex),
          coef: 1.0,
        }));

        subjectTo.push({
          name: `nodouble_p${pIndex}_e${eIndex}`,
          vars,
          bnds: {
            type: glpk.GLP_UP, // sum <= 1
            lb: 0.0,
            ub: 1.0,
          },
        });
      });
    });

    // 5) Monotonia su y (ordine per giocatore)
    // Ordiniamo i player per posizione crescente, considerando solo quelli con attacchi
    const orderedPlayerIndices = [...members]
      .map((m, idx) => ({ idx, position: m.position, attacksLeft: m.attacksLeft }))
      .filter((m) => m.attacksLeft > 0)
      .sort((a, b) => a.position - b.position)
      .map((o) => o.idx);

    const enemyPositions = Array.from(
      new Set(enemies.map((e) => e.position)),
    ).sort((a, b) => a - b);

    for (let k = 0; k < orderedPlayerIndices.length - 1; k++) {
      const p1 = orderedPlayerIndices[k];
      const p2 = orderedPlayerIndices[k + 1];

      for (const prefixPos of enemyPositions) {
        const vars: { name: string; coef: number }[] = [];

        enemies.forEach((e, eIndex) => {
          if (e.position <= prefixPos) {
            vars.push({ name: yName(p1, eIndex), coef: 1.0 });
            vars.push({ name: yName(p2, eIndex), coef: -1.0 });
          }
        });

        if (vars.length === 0) continue;

        subjectTo.push({
          name: `mono_p${p1}_p${p2}_p${prefixPos}`,
          vars,
          bnds: {
            type: glpk.GLP_LO,
            lb: 0.0,
            ub: 0.0,
          },
        });
      }
    }

    // 6) Vincolo hard: vieta repeat-attack per chi ha già attaccato quella base
    for (const s of slots) {
      const prevAttacks = attackedMap.get(s.ownerName);
      if (!prevAttacks || prevAttacks.size === 0) continue;

      enemies.forEach((e, eIndex) => {
        if (prevAttacks.has(e.position)) {
          subjectTo.push({
            name: `no_repeat_s${s.id}_e${eIndex}`,
            vars: [{ name: xName(s.id, eIndex), coef: 1.0 }],
            bnds: {
              type: glpk.GLP_FX,
              lb: 0.0,
              ub: 0.0,
            },
          });
        }
      });
    }

    // ---- Costruzione LP per glpk.js ---------------------------------------

    const lp: any = {
      name: "WarPlanMILP",
      objective: {
        direction: glpk.GLP_MAX,
        name: "obj",
        vars: objectiveVars,
      },
      subjectTo,
      binaries: [...varNamesX, ...varNamesY],
      // z_j sono continue => niente in binaries/generals
    };

    const options = {
      msglev: glpk.GLP_MSG_OFF,
      presol: true,
    };

    const res = glpk.solve(lp, options);

    if (res.result.status !== glpk.GLP_OPT) {
      console.warn("MILP non ottimo o infeasible, status:", res.result.status);
    }

    const varValues = res.result.vars as Record<string, number>;

    // ---- Interpreta soluzione in termini di attacchi slot->base -----------

    // Trova per ogni slot quale enemy è stato scelto (x_sj ~ 1)
    const chosenEnemyForSlot = new Map<number, number>(); // slotId -> enemyIndex

    for (const s of slots) {
      let chosenE: number | null = null;
      let bestVal = -Infinity;

      enemies.forEach((_, eIndex) => {
        const name = xName(s.id, eIndex);
        const val = varValues[name] ?? 0;
        if (val > 0.5 && val > bestVal) {
          bestVal = val;
          chosenE = eIndex;
        }
      });

      if (chosenE !== null) {
        chosenEnemyForSlot.set(s.id, chosenE);
      }
    }

    // ---- Aggrega per player nei campi richiesti ---------------------------

    // Prepara mappa base: ogni member con 0..2 attacchi
    const planMap = new Map<string, WarPlanRow>();
    members.forEach((m) => {
      planMap.set(m.name, {
        playerName: m.name,
        position: m.position,
        attack1Position: null,
        attack2Position: null,
      });
    });

    // Per ogni slot: raccogli i target assegnati per player
    const playerTargets = new Map<string, number[]>(); // name -> lista posizioni nemici

    for (const s of slots) {
      const eIndex = chosenEnemyForSlot.get(s.id);
      if (eIndex === undefined) continue;
      const enemy = enemies[eIndex];

      if (!playerTargets.has(s.ownerName)) {
        playerTargets.set(s.ownerName, []);
      }
      playerTargets.get(s.ownerName)!.push(enemy.position);
    }

    // Assegna attack1/attack2 scegliendo come primo il target più vicino alla posizione del player
    for (const m of members) {
      const row = planMap.get(m.name);
      if (!row) continue;

      const targets = playerTargets.get(m.name) ?? [];
      if (targets.length === 0) continue;

      // ordina i target per distanza dalla posizione del player
      targets.sort(
        (a, b) =>
          Math.abs(a - m.position) - Math.abs(b - m.position),
      );

      row.attack1Position = targets[0] ?? null;
      row.attack2Position = targets[1] ?? null;
      // eventuali target extra oltre i primi 2 vengono ignorati a livello di output
    }

    const rows = Array.from(planMap.values()).sort(
      (a, b) => a.position - b.position,
    );

    return rows;
  }
}