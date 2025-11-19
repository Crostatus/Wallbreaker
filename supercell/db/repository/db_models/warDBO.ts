export interface WarDBO {
    id: number;
    start_time: string;                 // TIMESTAMP → ISO string
    preparation_start_time: string;
    attacks_per_member: number;
    end_time: string;
    updated_at: string;
  
    clan_tag: string;
    clan_percentage: number;
    clan_stars: number;
    clan_badge_url: string | null;
  
    enemy_clan_tag: string;
    enemy_clan_name: string;
    enemy_clan_percentage: number;
    enemy_clan_stars: number;
    enemy_clan_badge_url: string | null;
}
  

export interface WarMemberDBO {
    war_id: number;
    tag_clan: string;
    tag: string;
    name: string;
    town_hall_level: number;
    position: number;
}

export interface WarAttackDBO {
    war_id: number;
    attacker_tag: string;
    defender_tag: string;
    stars: number;
    destruction_percentage: number;
    duration: number;    
}
  

export interface WarCardHeaderDBO {
    id: number;
    clan_tag: string;
    clan_name: string;
    clan_badge_url: string | null;
    enemy_clan_tag: string;
    enemy_clan_name: string;
    enemy_clan_badge_url: string | null;
    start_time: string;
    preparation_start_time: string;
    end_time: string;
    attacks_per_member: number;
    clan_percentage: number;
    clan_stars: number;
    enemy_clan_percentage: number;
    enemy_clan_stars: number;
}
  

export interface WarCardMemberDBO {
    tag: string;
    name: string;
    position: number;
    town_hall_level: number;
    best_stars_received: number;
    best_destruction_received: number;
    attacks_left: number;
}