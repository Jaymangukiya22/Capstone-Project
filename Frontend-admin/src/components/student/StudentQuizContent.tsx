import { useState, useEffect } from 'react'
import { Search, Grid, List } from 'lucide-react'
import { toast } from '@/lib/toast'
import { QuizOverviewPanel } from './QuizOverviewPanel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useQuizzes } from '@/hooks/useQuizzes'
import { useCategories } from '@/hooks/useCategories'
import { WEBSOCKET_URL } from '@/services/api';
import { friendMatchService } from '@/services/friendMatchService';

import type { Quiz } from '@/types/api'

interface StudentQuiz extends Quiz {
  categoryName?: string
}

export function StudentQuizContent() {
  const [selectedQuiz, setSelectedQuiz] = useState<StudentQuiz | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 12

  // Fetch quizzes and categories
  const { quizzes, loading: quizzesLoading } = useQuizzes()
  const { categories, loading: categoriesLoading } = useCategories({ autoFetch: true })

  const isLoading = quizzesLoading || categoriesLoading

  // Transform quizzes to include category names
  const enrichedQuizzes: StudentQuiz[] = (quizzes || []).map(quiz => {
    const category = categories.find(cat => cat.id === quiz.categoryId)
    return {
      ...quiz,
      categoryName: category?.name || 'Uncategorized'
    }
  })

  // Filter quizzes based on search and filters
  const filteredQuizzes = enrichedQuizzes.filter(quiz => {
    const matchesSearch = quiz.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         quiz.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         quiz.categoryName?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesCategory = selectedCategory === 'all' || quiz.categoryId.toString() === selectedCategory
    const matchesDifficulty = selectedDifficulty === 'all' || quiz.difficulty === selectedDifficulty

    return matchesSearch && matchesCategory && matchesDifficulty
  })

  // Pagination
  const totalPages = Math.ceil(filteredQuizzes.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedQuizzes = filteredQuizzes.slice(startIndex, startIndex + itemsPerPage)

  // Set default quiz
  useEffect(() => {
    if (enrichedQuizzes.length > 0 && !selectedQuiz) {
      setSelectedQuiz(enrichedQuizzes[0])
    }
  }, [enrichedQuizzes, selectedQuiz])

  const handleQuizSelect = (quiz: StudentQuiz) => {
    setSelectedQuiz(quiz)
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1) // Reset to first page when searching
  }

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value)
    setCurrentPage(1)
  }

  const handleDifficultyChange = (value: string) => {
    setSelectedDifficulty(value)
    setCurrentPage(1)
  }

  const handlePlayQuiz = (quizId: string, mode: string, gameCode?: string) => {
    if (mode === 'play-with-friend') {
      // For friend matches, we don't navigate immediately
      // The PlayWithFriendModal will handle the navigation
      return
    }

    // Store quiz info in sessionStorage for the quiz flow
    const quizInfo = {
      quizId,
      mode,
      gameCode, // This will be matchId for solo mode, join code for multiplayer
      quizName: selectedQuiz?.title,
      startTime: Date.now()
    }
    sessionStorage.setItem('currentQuiz', JSON.stringify(quizInfo))
    
    const modeLabels = {
      'solo': 'Solo vs AI',
      '1v1': '1v1',
      'multiplayer': 'Multiplayer',
      'play-with-friend': 'Play with Friend'
    }
    
    toast({
      title: "Starting Quiz!",
      description: `Starting quiz "${selectedQuiz?.title}" in ${modeLabels[mode as keyof typeof modeLabels] || mode} mode`,
    })
    
    // Navigate to quiz countdown page
    window.location.pathname = '/quiz-countdown'
  }

  const handleCreateFriendGame = async (joinCode: string) => {
    console.log('🎮 handleCreateFriendGame called with code:', joinCode)
    if (!selectedQuiz) return

    try {
      // Get the actual match details from backend using the join code
      const match = await friendMatchService.findMatchByCode(joinCode)
      
      if (match) {
        // Store friend match info in sessionStorage with real matchId
        const friendMatchInfo = {
          matchId: match.id, // Real matchId from backend
          joinCode,
          websocketUrl: WEBSOCKET_URL,
          quizName: selectedQuiz.title,
          quizId: selectedQuiz.id,
          mode: 'create'
        }
        console.log('🎮 Setting CREATE mode in sessionStorage with real matchId:', friendMatchInfo)
        sessionStorage.setItem('friendMatch', JSON.stringify(friendMatchInfo))
        
        toast({
          title: "Friend Match Created!",
          description: `Share code ${joinCode} with your friend`,
        })
        
        // Navigate to friend match interface
        window.location.pathname = '/friend-match'
      } else {
        toast({
          title: "Error",
          description: "Failed to find match details. Please try again.",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error getting match details:', error)
      toast({
        title: "Error", 
        description: "Failed to create match. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleJoinFriendGame = (joinCode: string) => {
    console.log('🎮 handleJoinFriendGame called with code:', joinCode)
    if (!selectedQuiz) return

    // Store friend match info in sessionStorage
    const friendMatchInfo = {
      joinCode,
      websocketUrl: WEBSOCKET_URL,
      quizName: selectedQuiz.title,
      quizId: selectedQuiz.id,
      mode: 'join'
    }
    console.log('🎮 Setting JOIN mode in sessionStorage:', friendMatchInfo)
    sessionStorage.setItem('friendMatch', JSON.stringify(friendMatchInfo))
    
    toast({
      title: "Joining Friend Match!",
      description: `Joining match with code ${joinCode}`,
    })
    
    // Navigate to friend match interface
    window.location.pathname = '/friend-match'
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'EASY': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      case 'HARD': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading quizzes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Left Panel - Quiz List with Filters */}
      <div className="w-1/2 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Header with Search and Filters */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search quizzes..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filters */}
            <div className="flex space-x-2">
              <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedDifficulty} onValueChange={handleDifficultyChange}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="EASY">Easy</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HARD">Hard</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              >
                {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
              </Button>
            </div>

            {/* Results count */}
            <div className="text-sm text-gray-500">
              Showing {paginatedQuizzes.length} of {filteredQuizzes.length} quizzes
            </div>
          </div>
        </div>

        {/* Quiz List */}
        <div className="flex-1 overflow-y-auto p-4">
          {paginatedQuizzes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No quizzes found matching your criteria.</p>
            </div>
          ) : (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 gap-4' : 'space-y-3'}>
              {paginatedQuizzes.map((quiz) => (
                <Card
                  key={quiz.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedQuiz?.id === quiz.id 
                      ? 'ring-2 ring-primary border-primary' 
                      : 'hover:border-gray-300'
                  }`}
                  onClick={() => handleQuizSelect(quiz)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{quiz.title}</CardTitle>
                      <Badge className={getDifficultyColor(quiz.difficulty)}>
                        {quiz.difficulty}
                      </Badge>
                    </div>
                    <CardDescription className="text-sm">
                      {quiz.categoryName} • {quiz.timeLimit}s per question
                    </CardDescription>
                  </CardHeader>
                  {quiz.description && (
                    <CardContent className="pt-0">
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {quiz.description}
                      </p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-500">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {/* Right Panel - Quiz Overview */}
      <div className="w-1/2">
        <QuizOverviewPanel
          selectedQuiz={selectedQuiz ? {
            id: selectedQuiz.id.toString(),
            name: selectedQuiz.title,
            description: selectedQuiz.description || '',
            category: selectedQuiz.categoryName || 'Uncategorized',
            subcategory: selectedQuiz.categoryName || 'Uncategorized',
            difficulty: selectedQuiz.difficulty.toLowerCase() as 'easy' | 'intermediate' | 'hard',
            questionCounts: { 
              total: 10, 
              easy: 3, 
              intermediate: 4, 
              hard: 3 
            },
            estimatedDuration: Math.ceil((selectedQuiz.timeLimit || 30) * 10 / 60),
            passingScore: 70,
            timePerQuestion: selectedQuiz.timeLimit || 30,
            maxPlayers: 10,
            lastUpdated: new Date(selectedQuiz.updatedAt),
            isActive: true
          } : null}
          onPlayQuiz={handlePlayQuiz}
          onCreateFriendGame={handleCreateFriendGame}
          onJoinFriendGame={handleJoinFriendGame}
        />
      </div>
    </div>
  )
}
