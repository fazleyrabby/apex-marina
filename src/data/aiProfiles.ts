import type { AIProfile } from '../types/index.ts';

export interface AIBotDef extends AIProfile {
  id: string;
  texture: string;
}

/** 5 distinct opponents per spec §16. */
export const AI_BOTS: AIBotDef[] = [
  {
    id: 'boat-ai-2',
    texture: 'boat-ai-2',
    name: 'Harbor Ace',
    hullColor: '#0ea5e9',
    maxSpeedRatio: 0.95,
    accelerationRatio: 1.0,
    turnSkill: 0.9,
    aggression: 0.5,
    mistakeChance: 0.02,
    avoidanceWeight: 1.0,
  },
  {
    id: 'boat-ai-1',
    texture: 'boat-ai-1',
    name: 'Cyan Flash',
    hullColor: '#eab308',
    maxSpeedRatio: 1.00,
    accelerationRatio: 0.95,
    turnSkill: 0.75,
    aggression: 0.8,
    mistakeChance: 0.08,
    avoidanceWeight: 0.6,
  },
  {
    id: 'boat-ai-3',
    texture: 'boat-ai-3',
    name: 'Wave Carver',
    hullColor: '#f97316',
    maxSpeedRatio: 0.92,
    accelerationRatio: 1.02,
    turnSkill: 1.0,
    aggression: 0.45,
    mistakeChance: 0.01,
    avoidanceWeight: 1.2,
  },
  {
    id: 'boat-ai-4',
    texture: 'boat-ai-4',
    name: 'Barge Runner',
    hullColor: '#10b981',
    maxSpeedRatio: 0.97,
    accelerationRatio: 1.05,
    turnSkill: 0.82,
    aggression: 0.95,
    mistakeChance: 0.05,
    avoidanceWeight: 0.4,
  },
  {
    id: 'boat-ai-5',
    texture: 'boat-ai-5',
    name: 'Drift Cadet',
    hullColor: '#8b5cf6',
    maxSpeedRatio: 0.88,
    accelerationRatio: 0.9,
    turnSkill: 0.7,
    aggression: 0.3,
    mistakeChance: 0.14,
    avoidanceWeight: 0.9,
  },
];
