import { useState, useEffect } from 'react'
import { Search, Grid, List, Menu, ChevronLeft } from 'lucide-react'
import { toast } from '@/lib/toast'
import { QuizOverviewPanel } from './QuizOverviewPanel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useQuizzes } from '@/hooks/useQuizzes'
import { useCategories } from '@/hooks/useCategories'
import { WEBSOCKET_URL } from '@/services/api';
import { friendMatchService } from '@/services/friendMatchService';
import { cn } from '@/lib/utils'

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showQuizDetails, setShowQuizDetails] = useState(false)
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
    // On mobile, show quiz details view
    if (window.innerWidth < 768) {
      setShowQuizDetails(true)
    }
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
      // CRITICAL: Clear old match state before creating new match
      localStorage.removeItem('friendMatchState');
      sessionStorage.removeItem('friendMatchState');
      
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

    // CRITICAL: Clear old match state before joining new match
    localStorage.removeItem('friendMatchState');
    sessionStorage.removeItem('friendMatchState');

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

  const getDifficultyVariant = (difficulty: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (difficulty) {
      case 'EASY': return 'secondary'
      case 'MEDIUM': return 'default'
      case 'HARD': return 'destructive'
      default: return 'outline'
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
    <div className="flex flex-col lg:flex-row h-full">
      {/* Mobile Header - Only visible on mobile */}
      <div className="lg:hidden flex items-center justify-between p-3 border-b bg-background sticky top-0 z-40">
        <h1 className="text-base font-semibold">Quiz Selection</h1>
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm">
              <Menu className="h-4 w-4 mr-1" />
              Filters
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[400px]">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              {/* Mobile Filters */}
              <div>
                <label className="text-sm font-medium mb-2 block">Category</label>
                <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                  <SelectTrigger className="w-full">
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
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Difficulty</label>
                <Select value={selectedDifficulty} onValueChange={handleDifficultyChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Levels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="EASY">Easy</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HARD">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">View Mode</label>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                >
                  {viewMode === 'grid' ? (
                    <><List className="h-4 w-4 mr-2" /> Switch to List View</>
                  ) : (
                    <><Grid className="h-4 w-4 mr-2" /> Switch to Grid View</>
                  )}
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Mobile Quiz Details View - Full screen on mobile when quiz is selected */}
      {showQuizDetails && window.innerWidth < 768 && selectedQuiz && (
        <div className="fixed inset-0 z-50 bg-background lg:hidden">
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 p-4 border-b">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowQuizDetails(false)}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h2 className="text-lg font-semibold flex-1">Quiz Details</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              <QuizOverviewPanel
                selectedQuiz={selectedQuiz ? {
                  id: selectedQuiz.id.toString(),
                  name: selectedQuiz.title,
                  description: selectedQuiz.description || '',
                  category: selectedQuiz.categoryName || 'Uncategorized',
                  subcategory: '',
                  difficulty: selectedQuiz.difficulty === 'EASY' ? 'easy' as const : 
                            selectedQuiz.difficulty === 'MEDIUM' ? 'intermediate' as const : 'hard' as const,
                  questionCounts: {
                    easy: 5,
                    intermediate: 5,
                    hard: 5,
                    total: 15
                  },
                  estimatedDuration: Math.floor((selectedQuiz.timeLimit || 30) / 60),
                  passingScore: 70,
                  timePerQuestion: 30,
                  maxPlayers: 4,
                  lastUpdated: new Date(),
                  isActive: true
                } : null}
                onPlayQuiz={handlePlayQuiz}
                onCreateFriendGame={handleCreateFriendGame}
                onJoinFriendGame={handleJoinFriendGame}
              />
            </div>
          </div>
        </div>
      )}

      {/* Left Panel - Quiz List with Filters */}
      <div className={cn(
        "w-full lg:w-1/2 xl:w-2/5 flex flex-col",
        "lg:border-r border-gray-200 dark:border-gray-700",
        showQuizDetails && window.innerWidth < 768 ? "hidden" : ""
      )}>
        {/* Mobile Search - Visible on mobile */}
        <div className="lg:hidden p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search quizzes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>

        {/* Desktop Search and Filters - Hidden on mobile */}
        <div className="hidden lg:block p-4 border-b border-gray-200 dark:border-gray-700">
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

            {/* Desktop Filters */}
            <div className="flex flex-wrap gap-2">
              <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                <SelectTrigger className="w-full sm:w-[180px]">
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
                <SelectTrigger className="w-full sm:w-[140px]">
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
                className="w-full sm:w-auto"
              >
                {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
                <span className="ml-2 sm:hidden">{viewMode === 'grid' ? 'List View' : 'Grid View'}</span>
              </Button>
            </div>

            {/* Results count */}
            <div className="text-sm text-gray-500">
              Showing {paginatedQuizzes.length} of {filteredQuizzes.length} quizzes
            </div>
          </div>
        </div>

        {/* Mobile Search - Visible only on mobile */}
        <div className="lg:hidden p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search quizzes..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Quiz List */}
        <div className="flex-1 overflow-y-auto p-3 lg:p-4">
          {filteredQuizzes.length === 0 ? (
            <div className="text-center py-8 lg:py-12">
              <p className="text-sm lg:text-base text-gray-500 dark:text-gray-400">No quizzes found matching your criteria.</p>
            </div>
          ) : (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4' : 'space-y-3 lg:space-y-4'}>
              {paginatedQuizzes.map((quiz) => (
                <Card 
                  key={quiz.id}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-lg",
                    selectedQuiz?.id === quiz.id && "ring-2 ring-primary"
                  )}
                  onClick={() => handleQuizSelect(quiz)}
                >
                  <CardHeader className="p-3 lg:p-6 pb-2 lg:pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm lg:text-lg line-clamp-2">{quiz.title}</CardTitle>
                      <Badge 
                        variant={getDifficultyVariant(quiz.difficulty)}
                        className="text-xs shrink-0"
                      >
                        {quiz.difficulty}
                      </Badge>
                    </div>
                    <CardDescription className="mt-1 text-xs lg:text-sm line-clamp-2">
                      {quiz.description || 'No description available'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 lg:p-6 pt-2 lg:pt-0">
                    <div className="flex items-center justify-between text-xs lg:text-sm text-gray-500">
                      <span className="truncate">{quiz.categoryName || 'Uncategorized'}</span>
                      <span className="shrink-0">{quiz.timeLimit ? `${quiz.timeLimit} min` : 'No limit'}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="text-xs sm:text-sm"
              >
                <span className="hidden sm:inline">Previous</span>
                <ChevronLeft className="h-4 w-4 sm:hidden" />
              </Button>
              <span className="text-xs sm:text-sm text-gray-500">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="text-xs sm:text-sm"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronLeft className="h-4 w-4 rotate-180 sm:hidden" />
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {/* Right Panel - Quiz Overview - Hidden on mobile, visible on desktop */}
      <div className="hidden lg:block lg:flex-1">
        <QuizOverviewPanel
          selectedQuiz={selectedQuiz ? {
            id: selectedQuiz.id.toString(),
            name: selectedQuiz.title,
            description: selectedQuiz.description || '',
            category: selectedQuiz.categoryName || 'Uncategorized',
            subcategory: '',
            difficulty: selectedQuiz.difficulty === 'EASY' ? 'easy' as const : 
                      selectedQuiz.difficulty === 'MEDIUM' ? 'intermediate' as const : 'hard' as const,
            questionCounts: {
              easy: 5,
              intermediate: 5,
              hard: 5,
              total: 15
            },
            estimatedDuration: Math.floor((selectedQuiz.timeLimit || 30) / 60),
            passingScore: 70,
            timePerQuestion: 30,
            maxPlayers: 4,
            lastUpdated: new Date(),
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
