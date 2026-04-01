
export interface Ingredient {
  name: string;
  dosageMg: number;
}

export interface Pill {
  id: string;
  name: string;
  ingredients: Ingredient[]; // Max 3
  color: string;
}

export interface PillTaken {
  pillId: string;
  quantity: number;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  pillsTaken: PillTaken[]; 
  pillIds?: string[]; // Legacy field for backward compatibility
  notes?: string;
}

export interface UserSettings {
  fontSize: string; // e.g., '1.25rem', '1.75rem', '2.25rem'
}

export interface UserData {
  email: string;
  pills: Pill[];
  logs: LogEntry[];
  settings: UserSettings;
}

export interface DailyAggregation {
  date: string; // YYYY-MM-DD
  logs: LogEntry[];
  totalIngredients: Record<string, number>; // Ingredient Name -> Total Mg
}

export enum AppTab {
  DASHBOARD = 'dashboard',
  CABINET = 'cabinet',
  ASSISTANT = 'assistant',
  REPORTS = 'reports',
  SETTINGS = 'settings',
}
