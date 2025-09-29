import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, CheckCircle2, Plus } from 'lucide-react';
import { useQuizzes } from '@/hooks/useQuizzes';
import { apiClient } from '@/services/api';

interface Quiz {
  id: number;
  title: string;
  description: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  category?: {
    id: number;
    name: string;
  };
  _count?: {
    quizQuestions: number;
  };
}

interface AddToQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedQuestionIds: string[];
  onSuccess: () => void;
}

export const AddToQuizModal: React.FC<AddToQuizModalProps> = ({
  isOpen,
  onClose,
  selectedQuestionIds,
  onSuccess,
}) => {
  const { quizzes: allQuizzes, loading: quizzesLoading } = useQuizzes();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuizId, setSelectedQuizId] = useState<number | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  
  // Filter quizzes based on search query
  const filteredQuizzes = Array.isArray(allQuizzes) 
    ? allQuizzes.filter(quiz => 
        quiz.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        quiz.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        quiz.category?.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleAssignToQuiz = async () => {
    if (!selectedQuizId || selectedQuestionIds.length === 0) return;

    setIsAssigning(true);
    try {
      const response = await apiClient.post(`/quizzes/${selectedQuizId}/questions`, {
        questionIds: selectedQuestionIds.map(id => parseInt(id))
      });

      if (response.data.success) {
        console.log('Questions assigned successfully');
        onSuccess();
        onClose();
      } else {
        throw new Error(response.data.message || 'Failed to assign questions');
      }
    } catch (error) {
      console.error('Failed to assign questions to quiz:', error);
      alert('Failed to assign questions to quiz. Please try again.');
    } finally {
      setIsAssigning(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'EASY': return 'bg-green-100 text-green-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'HARD': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSelectedQuizId(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add {selectedQuestionIds.length} Question{selectedQuestionIds.length !== 1 ? 's' : ''} to Quiz
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-hidden">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search quizzes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>

          {/* Quiz List */}
          <div className="flex-1 overflow-y-auto space-y-2 max-h-[400px]">
            {quizzesLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-sm text-gray-600">Loading quizzes...</span>
              </div>
            ) : filteredQuizzes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchQuery ? 'No quizzes found matching your search.' : 'No quizzes available.'}
              </div>
            ) : (
              filteredQuizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedQuizId === quiz.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedQuizId(quiz.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900">{quiz.title}</h4>
                        {selectedQuizId === quiz.id && (
                          <CheckCircle2 className="h-5 w-5 text-blue-500" />
                        )}
                      </div>
                      {quiz.description && (
                        <p className="text-sm text-gray-600 mt-1">{quiz.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={getDifficultyColor(quiz.difficulty)}>
                          {quiz.difficulty}
                        </Badge>
                        {quiz.category && (
                          <Badge variant="outline">
                            {quiz.category.name}
                          </Badge>
                        )}
                        {quiz._count?.quizQuestions !== undefined && (
                          <span className="text-xs text-gray-500">
                            {quiz._count.quizQuestions} questions
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isAssigning}>
            Cancel
          </Button>
          <Button 
            onClick={handleAssignToQuiz} 
            disabled={!selectedQuizId || isAssigning}
          >
            {isAssigning ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Assigning...
              </>
            ) : (
              `Add to Quiz`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
