import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, RotateCcw, Clock, Users, Zap, Target, CheckCircle } from "lucide-react"
import type { QuizSettings } from "@/types/quiz-settings"
import { defaultQuizSettings } from "@/types/quiz-settings"

interface QuizSettingsTabProps {
  quizId?: string
  totalQuestions?: number
}

export function QuizSettingsTab({ quizId = "default", totalQuestions = 0 }: QuizSettingsTabProps) {
  const [settings, setSettings] = useState<QuizSettings>(defaultQuizSettings)

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem(`quiz_builder_${quizId}_settings`)
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings)
        setSettings(parsed)
      } catch (error) {
        console.error('Failed to parse saved settings:', error)
      }
    }
  }, [quizId])

  // Auto-calculate total time limit when questions or time per question changes
  useEffect(() => {
    const totalTime = Math.round((totalQuestions * settings.timePerQuestion) / 60 * 10) / 10
    setSettings(prev => ({
      ...prev,
      totalTimeLimit: totalTime
    }))
  }, [totalQuestions, settings.timePerQuestion])

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(`quiz_builder_${quizId}_settings`, JSON.stringify(settings))
  }, [settings, quizId])

  const handleGameTypeChange = (gameType: QuizSettings['gameType']) => {
    let maxPlayers = 2
    if (gameType === 'one-vs-one') {
      maxPlayers = 2
    } else if (gameType === 'play-with-friend') {
      maxPlayers = 2
    } else if (gameType === 'multiplayer') {
      maxPlayers = 4
    }

    setSettings(prev => ({
      ...prev,
      gameType,
      maxPlayers
    }))
  }

  const handleMaxPlayersChange = (maxPlayers: number) => {
    setSettings(prev => ({
      ...prev,
      maxPlayers
    }))
  }

  const handleTimePerQuestionChange = (timePerQuestion: number) => {
    setSettings(prev => ({
      ...prev,
      timePerQuestion
    }))
  }

  const handleBonusChange = (bonusType: 'speedBonus' | 'streakBonus', checked: boolean) => {
    setSettings(prev => ({
      ...prev,
      [bonusType]: checked
    }))
  }

  const handleReset = () => {
    setSettings(defaultQuizSettings)
    localStorage.removeItem(`quiz_builder_${quizId}_settings`)
  }

  const handleSave = () => {
    console.log('Quiz settings saved:', settings)
    // Here you would typically send to backend
  }

  const getGameTypeLabel = (type: QuizSettings['gameType']) => {
    switch (type) {
      case 'one-vs-one': return '1v1'
      case 'play-with-friend': return 'Play with Friend'
      case 'multiplayer': return 'Multiplayer'
      default: return '1v1'
    }
  }

  const getMaxPlayersRange = () => {
    if (settings.gameType === 'one-vs-one') return { min: 2, max: 2, disabled: true }
    if (settings.gameType === 'play-with-friend') return { min: 2, max: 4, disabled: false }
    if (settings.gameType === 'multiplayer') return { min: 2, max: 10, disabled: false }
    return { min: 2, max: 2, disabled: true }
  }

  const playersRange = getMaxPlayersRange()

  return (
    <div className="space-y-6">
      {/* Game Format Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Game Format</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="gameType">Game Type *</Label>
              <Select value={settings.gameType} onValueChange={handleGameTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select game type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one-vs-one">1v1</SelectItem>
                  <SelectItem value="play-with-friend">Play with Friend</SelectItem>
                  <SelectItem value="multiplayer">Multiplayer</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Choose the type of game experience
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxPlayers">Maximum Players *</Label>
              <Select 
                value={settings.maxPlayers.toString()} 
                onValueChange={(value) => handleMaxPlayersChange(parseInt(value))}
                disabled={playersRange.disabled}
              >
                <SelectTrigger className={playersRange.disabled ? 'opacity-50' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: playersRange.max - playersRange.min + 1 }, (_, i) => {
                    const value = playersRange.min + i
                    return (
                      <SelectItem key={value} value={value.toString()}>
                        {value} players
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Range: {playersRange.min}-{playersRange.max} players
              </p>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
            <div className="flex items-center space-x-2 text-blue-700 dark:text-blue-400">
              <Clock className="h-4 w-4" />
              <span className="font-medium">Estimated Duration</span>
            </div>
            <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
              ~{settings.totalTimeLimit} minutes
            </p>
            <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">
              Based on {totalQuestions} questions × {settings.timePerQuestion}s per question
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Timing Settings Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Timing Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="timePerQuestion">Time Per Question (seconds) *</Label>
              <Input
                id="timePerQuestion"
                type="number"
                min="10"
                max="300"
                value={settings.timePerQuestion}
                onChange={(e) => handleTimePerQuestionChange(parseInt(e.target.value) || 30)}
                className="w-full"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                How long players have to answer each question
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalTimeLimit">Total Time Limit (minutes)</Label>
              <Input
                id="totalTimeLimit"
                type="number"
                value={settings.totalTimeLimit}
                disabled
                className="w-full opacity-50 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                0 = No overall time limit
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bonus Points Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5" />
            <span>Bonus Points</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="speedBonus"
              checked={settings.speedBonus}
              onCheckedChange={(checked) => handleBonusChange('speedBonus', checked as boolean)}
            />
            <Label htmlFor="speedBonus" className="flex items-center space-x-2 cursor-pointer">
              <Target className="h-4 w-4" />
              <span>Speed Bonus</span>
            </Label>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 ml-6">
            Award extra points for quick correct answers
          </p>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="streakBonus"
              checked={settings.streakBonus}
              onCheckedChange={(checked) => handleBonusChange('streakBonus', checked as boolean)}
            />
            <Label htmlFor="streakBonus" className="flex items-center space-x-2 cursor-pointer">
              <Target className="h-4 w-4" />
              <span>Streak Bonus</span>
            </Label>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 ml-6">
            Award bonus points for consecutive correct answers
          </p>
        </CardContent>
      </Card>

      {/* Summary Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5" />
            <span>Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Game Type:</span>
                <span className="text-sm font-semibold">{getGameTypeLabel(settings.gameType)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Maximum Players:</span>
                <span className="text-sm font-semibold">{settings.maxPlayers}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Time Per Question:</span>
                <span className="text-sm font-semibold">{settings.timePerQuestion}s</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Time Limit:</span>
                <span className="text-sm font-semibold">{settings.totalTimeLimit} mins</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Speed Bonus:</span>
                <span className="text-sm font-semibold">
                  {settings.speedBonus ? '✅ Enabled' : '❌ Disabled'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Streak Bonus:</span>
                <span className="text-sm font-semibold">
                  {settings.streakBonus ? '✅ Enabled' : '❌ Disabled'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-800">
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset
        </Button>
        <Button onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" />
          Save Settings
        </Button>
      </div>
    </div>
  )
}
