import { useState, useEffect } from 'react';
import { Search, Download, ChevronDown, ChevronUp, Trophy, Clock, Target, Users, Swords, Bot } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/services/api';

interface QuizPerformanceData {
  quiz: {
    id: number;
    title: string;
    description: string;
    difficulty: string;
    timeLimit: number;
    category: {
      id: number;
      name: string;
    };
  };
  attempts: StudentAttempt[];
  statistics: {
    totalAttempts: number;
    soloAttempts: number;
    friendMatches: number;
    completedAttempts: number;
    averageScore: number;
    highestScore: number;
    lowestScore: number | null;
    averageTimeSpent: number;
    passRate: number;
  };
}

interface StudentAttempt {
  id: number | string;
  type: 'SOLO_VS_AI' | 'PLAY_WITH_FRIEND';
  matchId?: string;
  user: {
    id: number;
    username: string;
    email: string;
    fullName: string;
  };
  status: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  percentage: number;
  timeSpent: number;
  startedAt: string;
  completedAt: string;
  createdAt: string;
  rank?: number;
  isWinner?: boolean;
}

export default function QuizPerformance() {
  const [performanceData, setPerformanceData] = useState<QuizPerformanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [expandedQuizzes, setExpandedQuizzes] = useState<Set<number>>(new Set());
  const [categories, setCategories] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    totalQuizzes: 0,
    totalAttempts: 0,
    soloAttempts: 0,
    friendMatches: 0,
    totalUniqueStudents: 0
  });

  useEffect(() => {
    fetchPerformanceData();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await apiClient.get('/categories');
      setCategories(response.data.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      const params: any = {};
      
      if (selectedCategory !== 'all') {
        params.categoryId = selectedCategory;
      }
      
      const response = await apiClient.get('/performance/quiz-performance', { params });
      setPerformanceData(response.data.data || []);
      setSummary(response.data.summary || {
        totalQuizzes: 0,
        totalAttempts: 0,
        soloAttempts: 0,
        friendMatches: 0,
        totalUniqueStudents: 0
      });
    } catch (error) {
      console.error('Error fetching performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleQuizExpansion = (quizId: number) => {
    const newExpanded = new Set(expandedQuizzes);
    if (newExpanded.has(quizId)) {
      newExpanded.delete(quizId);
    } else {
      newExpanded.add(quizId);
    }
    setExpandedQuizzes(newExpanded);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toUpperCase()) {
      case 'EASY':
        return 'bg-green-100 text-green-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      case 'HARD':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatTime = (seconds: number) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const filteredData = performanceData.filter(item => {
    const matchesSearch = item.quiz.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDifficulty = selectedDifficulty === 'all' || item.quiz.difficulty === selectedDifficulty.toUpperCase();
    return matchesSearch && matchesDifficulty;
  });

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-12 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-24 bg-gray-200 rounded animate-pulse" />
          <div className="h-24 bg-gray-200 rounded animate-pulse" />
          <div className="h-24 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="space-y-4">
          <div className="h-48 bg-gray-200 rounded animate-pulse" />
          <div className="h-48 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Quiz Performance Analytics</h1>
          <p className="text-gray-600 mt-1">Monitor student performance across all quizzes</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Quizzes</p>
                <p className="text-2xl font-bold">{summary.totalQuizzes}</p>
              </div>
              <Target className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Attempts</p>
                <p className="text-2xl font-bold">{summary.totalAttempts}</p>
              </div>
              <Clock className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Solo VS AI</p>
                <p className="text-2xl font-bold">{summary.soloAttempts}</p>
              </div>
              <Bot className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Friend Matches</p>
                <p className="text-2xl font-bold">{summary.friendMatches}</p>
              </div>
              <Swords className="h-8 w-8 text-pink-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Unique Students</p>
                <p className="text-2xl font-bold">{summary.totalUniqueStudents}</p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search quizzes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10"
                />
              </div>
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Quiz Performance Cards */}
      <div className="space-y-4">
        {filteredData.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-gray-500">No quiz performance data available</p>
            </CardContent>
          </Card>
        ) : (
          filteredData.map((quizData) => (
            <Card key={quizData.quiz.id} className="overflow-hidden">
              <CardHeader 
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleQuizExpansion(quizData.quiz.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <CardTitle className="text-lg">{quizData.quiz.title}</CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline">{quizData.quiz.category?.name}</Badge>
                        <Badge className={getDifficultyColor(quizData.quiz.difficulty)}>
                          {quizData.quiz.difficulty}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {quizData.statistics.totalAttempts} total
                        </span>
                        {quizData.statistics.soloAttempts > 0 && (
                          <span className="text-sm text-orange-600 flex items-center gap-1">
                            <Bot className="h-3 w-3" />
                            {quizData.statistics.soloAttempts} solo
                          </span>
                        )}
                        {quizData.statistics.friendMatches > 0 && (
                          <span className="text-sm text-pink-600 flex items-center gap-1">
                            <Swords className="h-3 w-3" />
                            {quizData.statistics.friendMatches} friend
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Average Score</p>
                      <p className={`text-2xl font-bold ${getScoreColor(quizData.statistics.averageScore)}`}>
                        {quizData.statistics.averageScore}%
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Pass Rate</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {quizData.statistics.passRate}%
                      </p>
                    </div>
                    {expandedQuizzes.has(quizData.quiz.id) ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </CardHeader>
              
              {expandedQuizzes.has(quizData.quiz.id) && (
                <CardContent className="border-t">
                  <div className="py-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold">Student Performance</h3>
                      <div className="flex gap-2 text-sm">
                        <span className="text-gray-500">
                          Highest: <span className="font-semibold text-green-600">{quizData.statistics.highestScore}%</span>
                        </span>
                        <span className="text-gray-500">
                          Lowest: <span className="font-semibold text-red-600">{quizData.statistics.lowestScore}%</span>
                        </span>
                        <span className="text-gray-500">
                          Avg Time: <span className="font-semibold">{formatTime(quizData.statistics.averageTimeSpent)}</span>
                        </span>
                      </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-4">Rank</th>
                            <th className="text-left py-2 px-4">Type</th>
                            <th className="text-left py-2 px-4">Student</th>
                            <th className="text-left py-2 px-4">Status</th>
                            <th className="text-left py-2 px-4">Score</th>
                            <th className="text-left py-2 px-4">Correct Answers</th>
                            <th className="text-left py-2 px-4">Time Spent</th>
                            <th className="text-left py-2 px-4">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {quizData.attempts.map((attempt) => (
                            <tr key={attempt.id} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-4">
                                {attempt.rank === 1 && (
                                  <div className="flex items-center gap-1">
                                    <Trophy className="h-4 w-4 text-yellow-500" />
                                    <span className="font-semibold">{attempt.rank}</span>
                                  </div>
                                )}
                                {attempt.rank === 2 && (
                                  <div className="flex items-center gap-1">
                                    <Trophy className="h-4 w-4 text-gray-400" />
                                    <span className="font-semibold">{attempt.rank}</span>
                                  </div>
                                )}
                                {attempt.rank === 3 && (
                                  <div className="flex items-center gap-1">
                                    <Trophy className="h-4 w-4 text-orange-600" />
                                    <span className="font-semibold">{attempt.rank}</span>
                                  </div>
                                )}
                                {attempt.rank && attempt.rank > 3 && (
                                  <span className="pl-5">{attempt.rank}</span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                {attempt.type === 'SOLO_VS_AI' ? (
                                  <Badge variant="outline" className="gap-1 bg-orange-50 text-orange-700 border-orange-200">
                                    <Bot className="h-3 w-3" />
                                    Solo VS AI
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="gap-1 bg-pink-50 text-pink-700 border-pink-200">
                                    <Swords className="h-3 w-3" />
                                    Friend
                                    {attempt.isWinner && ' 🏆'}
                                  </Badge>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                <div>
                                  <p className="font-medium">{attempt.user.fullName}</p>
                                  <p className="text-sm text-gray-500">{attempt.user.email}</p>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <Badge className={getStatusColor(attempt.status)}>
                                  {attempt.status}
                                </Badge>
                              </td>
                              <td className="py-3 px-4">
                                <span className={`font-semibold ${getScoreColor(attempt.percentage)}`}>
                                  {attempt.percentage}%
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                {attempt.correctAnswers}/{attempt.totalQuestions}
                              </td>
                              <td className="py-3 px-4">
                                {formatTime(attempt.timeSpent)}
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-500">
                                {attempt.completedAt ? 
                                  new Date(attempt.completedAt).toLocaleString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric', 
                                    year: 'numeric', 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  }) :
                                  'Not completed'
                                }
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
