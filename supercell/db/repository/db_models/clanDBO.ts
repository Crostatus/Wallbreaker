export interface ClanDBO {
    tag: string;
    name: string;
    description: string;
    badgeUrl: string;
    clanLevel: number;
    requiredTrophies: number;
    requiredBuilderBaseTrophies: number;
    requiredTownhallLevel: number;
    warWinStreak: number;
    warWins: number;
    warTies: number;
    warLosses: number;
    updatedAt?: string; // ISO timestamp
  }
  
  export interface ClanMemberDBO {  
    tag: string;
    tagClan: string;
    name: string;  
    townHallLevel: number;
    expLevel: number;  
    leagueTier: string;
    trophies: number;
    builderBaseTrophies: number;  
    donations: number;
    donationsReceived: number; 
  }