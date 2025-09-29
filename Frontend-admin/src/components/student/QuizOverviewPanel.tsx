import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  BookOpen,
  Clock,
  Calendar,
  Target,
  Rocket,
  Bot
} from 'lucide-react'
// import { Users } from 'lucide-react' // Unused for now
import { mockQuizModes, type StudentQuiz } from '@/services/studentQuizService'
import { matchService, type AIOpponent } from '@/services/matchService'
import { PlayWithFriendModal } from './PlayWithFriendModal'

interface QuizOverviewPanelProps {
  selectedQuiz: StudentQuiz | null
  onPlayQuiz: (quizId: string, mode: string, gameCode?: string) => void
  onCreateFriendGame?: (joinCode: string) => void
  onJoinFriendGame?: (joinCode: string) => void
}

export function QuizOverviewPanel({ 
  selectedQuiz, 
  onPlayQuiz, 
  onCreateFriendGame, 
  onJoinFriendGame 
}: QuizOverviewPanelProps) {
  const [selectedMode, setSelectedMode] = useState<string>('')
  const [showFriendModal, setShowFriendModal] = useState(false)
  const [aiOpponents, setAIOpponents] = useState<AIOpponent[]>([])
  const [selectedAIOpponent, setSelectedAIOpponent] = useState<string>('')
  const [isLoadingAI, setIsLoadingAI] = useState(false)

  // Load AI opponents when component mounts
  useEffect(() => {
    const loadAIOpponents = async () => {
      setIsLoadingAI(true)
      try {
        const opponents = await matchService.getAIOpponents()
        setAIOpponents(opponents)
        // Auto-select appropriate AI based on quiz difficulty
        if (opponents.length > 0 && selectedQuiz) {
          const difficultyMap = {
            'easy': 'rookie-bot',
            'intermediate': 'smart-bot', 
            'hard': 'genius-bot'
          }
          const recommendedAI = difficultyMap[selectedQuiz.difficulty] || 'smart-bot'
          const aiExists = opponents.find(ai => ai.id === recommendedAI)
          setSelectedAIOpponent(aiExists ? recommendedAI : opponents[0].id)
        }
      } catch (error) {
        console.error('Error loading AI opponents:', error)
      } finally {
        setIsLoadingAI(false)
      }
    }

    loadAIOpponents()
  }, [selectedQuiz])

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'hard': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  const handlePlayClick = async () => {
    if (!selectedQuiz || !selectedMode) return

    if (selectedMode === 'play-with-friend') {
      setShowFriendModal(true)
    } else if (selectedMode === 'solo') {
      // Create solo match with AI opponent
      try {
        console.log('🔍 Debug: matchService =', matchService)
        console.log('🔍 Debug: matchService.createSoloMatch =', matchService?.createSoloMatch)
        
        if (!matchService) {
          throw new Error('matchService is undefined')
        }
        
        if (!matchService.createSoloMatch) {
          throw new Error('createSoloMatch method is undefined')
        }
        
        const matchId = await matchService.createSoloMatch(
          parseInt(selectedQuiz.id), 
          selectedAIOpponent
        )
        if (matchId) {
          onPlayQuiz(selectedQuiz.id, selectedMode, matchId)
        }
      } catch (error) {
        console.error('Error creating solo match:', error)
      }
    } else {
      onPlayQuiz(selectedQuiz.id, selectedMode)
    }
  }

  const handleJoinGame = (code: string) => {
    if (!selectedQuiz) return
    if (onJoinFriendGame) {
      onJoinFriendGame(code)
    } else {
      onPlayQuiz(selectedQuiz.id, 'play-with-friend', code)
    }
  }

  const handleCreateGame = (code: string) => {
    if (!selectedQuiz) return
    if (onCreateFriendGame) {
      onCreateFriendGame(code)
    } else {
      onPlayQuiz(selectedQuiz.id, 'play-with-friend', code)
    }
  }

  if (!selectedQuiz) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900/50">
        <div className="text-center space-y-4 max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto">
            <BookOpen className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Select a Quiz to Get Started
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Choose a quiz from the category tree on the left to view details and start playing.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {selectedQuiz.name}
            </h1>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              {selectedQuiz.description}
            </p>
          </div>
          <Badge className={getDifficultyColor(selectedQuiz.difficulty)}>
            {selectedQuiz.difficulty}
          </Badge>
        </div>

        <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-md">
            {selectedQuiz.category}
          </span>
          <span>•</span>
          <span>{selectedQuiz.subcategory}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Quiz Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>Quiz Overview</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <BookOpen className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {selectedQuiz.questionCounts.total}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Total Questions</div>
              </div>
              
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <Clock className="h-6 w-6 mx-auto mb-2 text-green-500" />
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {selectedQuiz.estimatedDuration}m
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Duration</div>
              </div>
              
              
              
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <Calendar className="h-6 w-6 mx-auto mb-2 text-orange-500" />
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {selectedQuiz.timePerQuestion}s
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Per Question</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Question Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Question Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-300">Easy</span>
                </div>
                <Badge variant="outline">{selectedQuiz.questionCounts.easy} questions</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-300">Intermediate</span>
                </div>
                <Badge variant="outline">{selectedQuiz.questionCounts.intermediate} questions</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-300">Hard</span>
                </div>
                <Badge variant="outline">{selectedQuiz.questionCounts.hard} questions</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Details */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-300">Last Updated</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {selectedQuiz.lastUpdated.toLocaleDateString()}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-300">Status</span>
              <Badge variant={selectedQuiz.isActive ? "default" : "secondary"}>
                {selectedQuiz.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-300">Estimated Duration</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                ~{selectedQuiz.estimatedDuration} minutes
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Play Section */}
      <div className="border-t border-gray-200 dark:border-gray-800 p-6 bg-gray-50 dark:bg-gray-800/50">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              Select Game Mode
            </label>
            <Select value={selectedMode} onValueChange={setSelectedMode}>
              <SelectTrigger>
                <SelectValue placeholder="Choose how you want to play" />
              </SelectTrigger>
              <SelectContent>
                {mockQuizModes.map((mode) => (
                  <SelectItem key={mode.value} value={mode.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{mode.label}</span>
                      <span className="text-xs text-gray-500">{mode.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* AI Opponent Selection - only show for solo mode */}
          {selectedMode === 'solo' && (
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                <Bot className="inline h-4 w-4 mr-1" />
                Choose AI Opponent
              </label>
              <Select 
                value={selectedAIOpponent} 
                onValueChange={setSelectedAIOpponent}
                disabled={isLoadingAI}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingAI ? "Loading AI opponents..." : "Select AI opponent"} />
                </SelectTrigger>
                <SelectContent>
                  {aiOpponents.map((opponent) => (
                    <SelectItem key={opponent.id} value={opponent.id}>
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{opponent.avatar || '🤖'}</span>
                        <div className="flex flex-col">
                          <span className="font-medium">{opponent.name}</span>
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              opponent.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                              opponent.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {opponent.difficulty}
                            </span>
                            <span>{opponent.accuracyRate}% accuracy</span>
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* AI Opponent Info */}
              {selectedAIOpponent && (
                <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  {(() => {
                    const selectedAI = aiOpponents.find(ai => ai.id === selectedAIOpponent)
                    if (!selectedAI) return null
                    
                    return (
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{selectedAI.avatar || '🤖'}</span>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-sm text-gray-900 dark:text-white">
                              {selectedAI.name}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {selectedAI.accuracyRate}% accuracy
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            Response time: {selectedAI.responseTimeRange.min}-{selectedAI.responseTimeRange.max}s
                          </p>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          )}

          <Button
            onClick={handlePlayClick}
            disabled={!selectedMode || !selectedQuiz.isActive}
            className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <Rocket className="h-5 w-5 mr-2" />
            PLAY 
          </Button>

          {!selectedQuiz.isActive && (
            <p className="text-xs text-center text-red-500 dark:text-red-400">
              This quiz is currently inactive and cannot be played.
            </p>
          )}
        </div>
      </div>

      {/* Play with Friend Modal */}
      <PlayWithFriendModal
        open={showFriendModal}
        onOpenChange={setShowFriendModal}
        selectedQuiz={selectedQuiz}
        onJoinGame={handleJoinGame}
        onCreateGame={handleCreateGame}
      />
    </div>
  )
}
