export interface QuizSettings {
  gameType: 'one-vs-one' | 'play-with-friend' | 'multiplayer'
  maxPlayers: number
  timePerQuestion: number
  totalTimeLimit: number
  speedBonus: boolean
  streakBonus: boolean
}

export interface QuizSettingsState {
  settings: QuizSettings
  isLoading: boolean
}

export const defaultQuizSettings: QuizSettings = {
  gameType: 'one-vs-one',
  maxPlayers: 2,
  timePerQuestion: 30,
  totalTimeLimit: 0,
  speedBonus: false,
  streakBonus: false
}
