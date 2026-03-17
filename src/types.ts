export type EnemyMoveType = 'thought' | 'urge' | 'action';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  timezone?: string;
  linkedWarUserId?: string;
  hasCompletedOnboarding?: boolean;
  createdAt: any; // Timestamp
  role?: 'user' | 'admin';
}

export interface IfThenTrap {
  enemy: string;
  counter: string;
}

export interface ManipulationShield {
  tactic: string;
  reality: string;
  betterThought: string;
}

export interface EnemyMove {
  id: string;
  userId: string;
  date: string;
  time: string;
  type: EnemyMoveType;
  description: string;
  trigger: string;
  impact: number;
  relatedArea?: string;
  usedCounter?: boolean;
  counterTalk?: string;
  counterAction?: string;
  ifThenTrap?: IfThenTrap;
  shield?: ManipulationShield;
  createdAt: any; // Timestamp
}

export interface IdentityScript {
  id: string;
  userId: string;
  text: string;
  active: boolean;
  createdAt: any;
}

export interface Experiment {
  id: string;
  userId: string;
  title: string;
  hypothesis: string;
  action: string;
  durationDays: number;
  startDate: string;
  status: 'active' | 'completed' | 'failed';
  successCount: number;
  totalAttempts: number;
  createdAt: any;
}

export interface Script {
  id: string;
  userId: string;
  title: string;
  trigger: string;
  selfTalk: string;
  action: string;
  pinned: boolean;
  createdAt: any; // Timestamp
}

export interface WeeklyStats {
  totalMoves: number;
  movesByDay: { date: string; count: number; avgImpact: number }[];
  movesByTrigger: Record<string, number>;
  counterAppliedCount: number;
}
