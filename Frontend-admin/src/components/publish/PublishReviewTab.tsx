import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { 
  Eye, 
  FileText, 
  Users, 
  Clock, 
  Target, 
  CheckCircle, 
  AlertTriangle,
  Rocket,
  Save
} from "lucide-react"
import type { Question } from "@/types/question"
import type { QuizSettings } from "@/types/quiz-settings"

interface QuizFormData {
  title: string
  description: string
  tags: string
  categoryId: string
  subcategoryId: string
}

interface PublishReviewTabProps {
  quizId?: string
  quizData: QuizFormData
  questions: Question[]
  settings: QuizSettings
}

export function PublishReviewTab({ 
  quizId = "default", 
  quizData, 
  questions, 
  settings 
}: PublishReviewTabProps) {
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isPublished, setIsPublished] = useState(false)

  // Check if quiz is already published
  useEffect(() => {
    const publishedStatus = localStorage.getItem(`quiz_builder_${quizId}_published`)
    setIsPublished(publishedStatus === 'true')
  }, [quizId])

  const getGameTypeLabel = (type: QuizSettings['gameType']) => {
    switch (type) {
      case 'one-vs-one': return '1v1'
      case 'play-with-friend': return 'Play with Friend'
      case 'multiplayer': return 'Multiplayer'
      default: return '1v1'
    }
  }

  const getCategoryName = (categoryId: string) => {
    // This would typically come from your categories data
    return categoryId || 'No category selected'
  }

  const getSubcategoryName = (subcategoryId: string) => {
    // This would typically come from your categories data
    return subcategoryId || 'No subcategory selected'
  }

  const isQuizComplete = () => {
    return (
      quizData.title.trim() !== '' &&
      quizData.description.trim() !== '' &&
      quizData.categoryId !== '' &&
      questions.length > 0 &&
      settings.timePerQuestion > 0
    )
  }

  const getCompletionIssues = () => {
    const issues = []
    if (!quizData.title.trim()) issues.push('Quiz title is required')
    if (!quizData.description.trim()) issues.push('Quiz description is required')
    if (!quizData.categoryId) issues.push('Category selection is required')
    if (questions.length === 0) issues.push('At least one question is required')
    if (settings.timePerQuestion <= 0) issues.push('Time per question must be greater than 0')
    return issues
  }

  const handleSaveAsDraft = () => {
    localStorage.setItem(`quiz_builder_${quizId}_draft`, 'true')
    localStorage.setItem(`quiz_builder_${quizId}_published`, 'false')
    console.log('Quiz saved as draft')
  }

  const handlePublishQuiz = async () => {
    setIsPublishing(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Mark as published
    localStorage.setItem(`quiz_builder_${quizId}_published`, 'true')
    localStorage.setItem(`quiz_builder_${quizId}_draft`, 'false')
    
    setIsPublished(true)
    setIsPublishing(false)
    setShowPublishModal(false)
    
    console.log('Quiz published successfully!')
  }

  const completionIssues = getCompletionIssues()
  const canPublish = isQuizComplete() && !isPublished

  return (
    <div className="space-y-6">
      {/* Quiz Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Quiz Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{quizData.title || 'Untitled Quiz'}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {quizData.description || 'No description provided'}
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Category:</span>
                  <span className="text-sm">{getCategoryName(quizData.categoryId)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Subcategory:</span>
                  <span className="text-sm">{getSubcategoryName(quizData.subcategoryId)}</span>
                </div>
                {quizData.tags && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Tags:</span>
                    <div className="flex flex-wrap gap-1">
                      {quizData.tags.split(',').map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag.trim()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
                <div className="flex items-center space-x-2 text-blue-700 dark:text-blue-400 mb-2">
                  <Target className="h-4 w-4" />
                  <span className="font-medium">Questions Summary</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Total Questions:</span>
                    <span className="font-semibold">{questions.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Easy:</span>
                    <span>{questions.filter(q => q.difficulty === 'easy').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Intermediate:</span>
                    <span>{questions.filter(q => q.difficulty === 'intermediate').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Hard:</span>
                    <span>{questions.filter(q => q.difficulty === 'hard').length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Game Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Game Configuration</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Game Format</span>
              </div>
              <p className="text-lg font-semibold">{getGameTypeLabel(settings.gameType)}</p>
              <p className="text-xs text-gray-500">Max {settings.maxPlayers} players</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Timing</span>
              </div>
              <p className="text-lg font-semibold">{settings.timePerQuestion}s per question</p>
              <p className="text-xs text-gray-500">~{settings.totalTimeLimit} minutes total</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Target className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Bonus Points</span>
              </div>
              <div className="space-y-1">
                <p className="text-sm">
                  Speed: {settings.speedBonus ? '✅ Enabled' : '❌ Disabled'}
                </p>
                <p className="text-sm">
                  Streak: {settings.streakBonus ? '✅ Enabled' : '❌ Disabled'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Completion Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5" />
            <span>Completion Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {completionIssues.length === 0 ? (
            <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Quiz is ready to publish!</span>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">Please complete the following:</span>
              </div>
              <ul className="space-y-1 ml-7">
                {completionIssues.map((issue, index) => (
                  <li key={index} className="text-sm text-gray-600 dark:text-gray-400">
                    • {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Publication Status */}
      {isPublished && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-green-700 dark:text-green-400">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Quiz Published Successfully!</span>
            </div>
            <p className="text-sm text-green-600 dark:text-green-300 mt-1">
              Your quiz is now live and available for players. Published quizzes cannot be edited.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-800">
        <Button variant="outline" onClick={handleSaveAsDraft} disabled={isPublished}>
          <Save className="mr-2 h-4 w-4" />
          Save as Draft
        </Button>

        <Dialog open={showPublishModal} onOpenChange={setShowPublishModal}>
          <DialogTrigger asChild>
            <Button 
              disabled={!canPublish || isPublishing}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Rocket className="mr-2 h-4 w-4" />
              {isPublishing ? 'Publishing...' : 'Publish Quiz'}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <span>Confirm Publication</span>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Are you sure you want to publish this quiz? Once published, it cannot be changed.
              </p>
              <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  <strong>Note:</strong> Published quizzes become live immediately and will be available to all players.
                </p>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowPublishModal(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handlePublishQuiz}
                  disabled={isPublishing}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {isPublishing ? 'Publishing...' : 'Confirm & Publish'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
