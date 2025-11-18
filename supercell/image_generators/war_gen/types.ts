import { WarPlayerGeneratedCard } from "../war_player_card_gen/types.ts";

export interface WarCardData {
    preparationStartTime: string;
    startTime: string;
    endTime: string;
    clanName: string;             
    opponentClanName: string;             
    clanStars: number;            
    opponentClanStars: number;      
    destruction: number;
    opponentDestruction: number;
    clanAttacks: number;
    opponentClanAttacks: number;
}

export interface WarPlayersByClan {
    [clanName: string]: WarPlayerGeneratedCard[];
}
  