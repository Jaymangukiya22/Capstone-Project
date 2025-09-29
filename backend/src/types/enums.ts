// Shared enums to avoid circular dependencies

export enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD'
}

export enum UserRole {
  ADMIN = 'ADMIN',
  PLAYER = 'PLAYER'
}

export enum AttemptStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ABANDONED = 'ABANDONED'
}

export enum MatchStatus {
  WAITING = 'WAITING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum MatchType {
  SOLO = 'SOLO',
  MULTIPLAYER = 'MULTIPLAYER',
  TOURNAMENT = 'TOURNAMENT'
}

export enum PlayerStatus {
  JOINED = 'JOINED',
  WAITING = 'WAITING',
  READY = 'READY',
  PLAYING = 'PLAYING',
  FINISHED = 'FINISHED',
  DISCONNECTED = 'DISCONNECTED'
}
