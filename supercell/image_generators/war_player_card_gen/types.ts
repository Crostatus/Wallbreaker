export interface WarPlayerCardData {
    position: number;
    name: string;
    stars: number;
    attacksLeft: number;
    destruction: number;
    townhall: number;
}

export interface WarPlayerGeneratedCard {
    player: string;  
    position: number;  
    filePath: string;
}
  