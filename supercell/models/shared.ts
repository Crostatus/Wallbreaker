/** Icone e badge per clan, leghe, etichette ecc. */
export interface BadgeUrls {
    small: string;
    medium: string;
    large: string;
  }
  
  /** Posizione geografica del clan */
  export interface Location {
    id: number;
    name: string;
    isCountry: boolean;
    countryCode: string;
  }
  
  /** Etichetta generica (es. Farming, War, Casual...) */
  export interface Label {
    id: number;
    name: string;
    iconUrls: BadgeUrls;
  }
  
  /** Lega o livello competitivo */
  export interface League {
    id: number;
    name: string;
    iconUrls: BadgeUrls;
  }
  
  /** Lingua della chat del clan */
  export interface Language {
    id: number;
    name: string;
    languageCode: string;
  }
  
  /** Lega guerre (Clan War League) */
  export interface WarLeague {
    id: number;
    name: string;
  }
  
  /** Lega Capitale (Clan Capital League) */
  export interface CapitalLeague {
    id: number;
    name: string;
  }
  
export type PlayerRole =
  | "NOT_MEMBER"
  | "MEMBER"
  | "LEADER"
  | "ADMIN"
  | "COLEADER";

export type WarPreference = "OUT" | "IN";


export interface PlayerClan {
  tag: string;
  name: string;
  clanLevel: number;
  badgeUrls: BadgeUrls;
}

export interface LeagueTier {
  id: number;
  name: string;
  iconUrls: {
    small: string;
    large: string;
  };
}

export type Village = "home" | "builderBase";

export interface Troop {
  name: string;
  level: number;
  maxLevel: number;
  village: Village;
}

export interface Hero {
  name: string;
  level: number;
  maxLevel?: number;
  village: Village;
}

export interface Spell {
  name: string;
  level: number;
  maxLevel: number;
  village: Village;
}

export interface Player {
  tag: string;
  name: string;
  townHallLevel: number;
  expLevel: number;

  trophies: number;
  bestTrophies: number;
  warStars: number;
  attackWins: number;
  defenseWins: number;

  builderHallLevel?: number;
  builderBaseTrophies?: number;
  bestBuilderBaseTrophies?: number;

  role: PlayerRole;
  warPreference: WarPreference;

  donations: number;
  donationsReceived: number;
  clanCapitalContributions?: number;

  clan?: PlayerClan;
  leagueTier?: LeagueTier;

  troops?: Troop[];
  heroes?: Hero[];
  spells?: Spell[];
}

/** Oggetto base per immagini (icone, badge, ecc.) */
export interface IconUrls {
  small?: string;
  tiny?: string;
  medium?: string;
  large?: string;
}

/** Oggetto base per badge dei clan */
export interface BadgeUrls {
  small: string;
  medium: string;
  large: string;
}


/** Rappresenta una lega capitale */
export interface CapitalLeague {
  id: number;
  name: string;
}

/** Rappresenta una lega guerra */
export interface WarLeague {
  id: number;
  name: string;
}

/** Rappresenta una lega del builder base */
export interface BuilderBaseLeague {
  id: number;
  name: string;
}

/** Rappresenta un linguaggio */
export interface Language {
  id: number;
  name: string;
  languageCode: string;
}

/** Rappresenta un distretto del Clan Capital */
export interface CapitalDistrict {
  id: number;
  name: string;
  districtHallLevel: number;
}

/** Rappresenta il Clan Capital */
export interface ClanCapital {
  capitalHallLevel: number;
  districts: CapitalDistrict[];
}

/** Elemento visivo della casa del giocatore */
export interface PlayerHouseElement {
  type: "ground" | "walls" | "roof" | "decoration";
  id: number;
}

/** Struttura della casa del giocatore */
export interface PlayerHouse {
  elements: PlayerHouseElement[];
}

/** Membro del clan */
export interface ClanMember {  
  tag: string;
  name: string;
  role: "leader" | "coLeader" | "admin" | "member";
  townHallLevel: number;
  expLevel: number;
  league: League;
  leagueTier?: LeagueTier;
  trophies: number;
  builderBaseTrophies: number;
  clanRank: number;
  previousClanRank: number;
  donations: number;
  donationsReceived: number;
  playerHouse?: PlayerHouse;
  builderBaseLeague?: BuilderBaseLeague;
}

/** Informazioni complete sul clan */
export interface Clan {
  tag: string;
  name: string;
  type: "open" | "inviteOnly" | "closed";
  description: string;
  location: Location;
  isFamilyFriendly: boolean;
  badgeUrls: BadgeUrls;
  clanLevel: number;
  clanPoints: number;
  clanBuilderBasePoints: number;
  clanCapitalPoints: number;
  capitalLeague: CapitalLeague;
  requiredTrophies: number;
  requiredBuilderBaseTrophies: number;
  requiredTownhallLevel: number;
  warFrequency:
    | "always"
    | "moreThanOncePerWeek"
    | "oncePerWeek"
    | "lessThanOncePerWeek"
    | "never"
    | "unknown"
    | "any";
  warWinStreak: number;
  warWins: number;
  warTies: number;
  warLosses: number;
  isWarLogPublic: boolean;
  warLeague: WarLeague;
  members: number;
  memberList: ClanMember[];
  labels: Label[];
  clanCapital: ClanCapital;
  chatLanguage: Language;
}

export interface ClanWarAttack {
  order: number;
  attackerTag: string;
  defenderTag: string;
  stars: number;
  destructionPercentage: number;
  duration: number;
}

export interface ClanWarMember {
  tag: string;
  name: string;
  mapPosition: number;
  townHallLevel: number;
  opponentAttacks: number;
  bestOpponentAttack: ClanWarAttack;  
  attacks: ClanWarAttack[];
}

export interface WarClan {
  destructionPercentage: number;
  tag: string;
  name: string;
  badgeUrls: BadgeUrls;
  attacks: number;
  stars: number;
  members: ClanWarMember[];
}

export interface ClanWar {
  clan: WarClan;
  opponent: WarClan;
  teamSize: number;
  attacksPerMember: number;
  startTime: string;
  endTime: string;
  state: 
    "CLAN_NOT_FOUND" |
    "ACCESS_DENIED" | 
    "NOT_IN_WAR" |  
    "IN_MATCHMAKING" | 
    "ENTER_WAR" | 
    "MATCHED" | 
    "PREPARATION" | 
    "preparation" |
    "WAR" |
    "war" | 
    "IN_WAR" |
    "inWar" | 
    "ENDED" | 
    "ended";
  preparationStartTime: string;
}