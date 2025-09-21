import React, { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { RadioGroup, RadioGroupItem } from '../ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { AlertCircle } from 'lucide-react'
import type { QuestionBankItem } from '../../services/questionBankService'
import type { Category as ApiCategory } from '../../types/api'

interface AddEditQuestionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  question?: QuestionBankItem // undefined for add, QuestionBankItem for edit
  categories: ApiCategory[]
  selectedNodeId?: string | null
  selectedNodeType?: 'category' | 'subcategory' | 'global' | 'quiz'
  onSave: (questionData: any) => void
}

export function AddEditQuestionModal({
  open,
  onOpenChange,
  question,
  categories,
  selectedNodeId,
  selectedNodeType,
  onSave
}: AddEditQuestionModalProps) {
  const [formData, setFormData] = useState({
    questionText: '',
    options: [
      { optionText: '', isCorrect: false },
      { optionText: '', isCorrect: false },
      { optionText: '', isCorrect: false },
      { optionText: '', isCorrect: false }
    ],
    difficulty: 'EASY' as 'EASY' | 'MEDIUM' | 'HARD',
    categoryId: null as number | null
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  // Initialize form data when question changes
  useEffect(() => {
    if (question) {
      // Edit mode - populate with existing question data
      const options = [...question.options]
      // Ensure we have exactly 4 options
      while (options.length < 4) {
        options.push({ 
          id: 0, 
          questionId: 0, 
          optionText: '', 
          isCorrect: false,
          createdAt: '',
          updatedAt: ''
        })
      }
      
      setFormData({
        questionText: question.questionText,
        options: options.slice(0, 4),
        difficulty: question.difficulty,
        categoryId: question.categoryId || null
      })
    } else {
      // Add mode - initialize with defaults
      let initialCategoryId: number | null = null
      
      if (selectedNodeId && selectedNodeType !== 'global') {
        if (selectedNodeType === 'category' || selectedNodeType === 'subcategory') {
          initialCategoryId = parseInt(selectedNodeId)
        }
      }

      setFormData({
        questionText: '',
        options: [
          { optionText: '', isCorrect: false },
          { optionText: '', isCorrect: false },
          { optionText: '', isCorrect: false },
          { optionText: '', isCorrect: false }
        ],
        difficulty: 'EASY',
        categoryId: initialCategoryId
      })
    }
    setErrors([])
  }, [question, open, selectedNodeId, selectedNodeType])

  const handleOptionChange = (index: number, field: 'optionText' | 'isCorrect', value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map((option, i) => 
        i === index ? { ...option, [field]: value } : option
      )
    }))
  }

  const handleCorrectAnswerChange = (index: number) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map((option, i) => ({
        ...option,
        isCorrect: i === index
      }))
    }))
  }

  const validateForm = () => {
    const newErrors: string[] = []
    
    if (!formData.questionText.trim()) {
      newErrors.push('Question text is required')
    }
    
    const filledOptions = formData.options.filter(opt => opt.optionText.trim())
    if (filledOptions.length < 2) {
      newErrors.push('At least 2 options are required')
    }
    
    const hasCorrectAnswer = formData.options.some(opt => opt.isCorrect && opt.optionText.trim())
    if (!hasCorrectAnswer) {
      newErrors.push('Please select a correct answer from the filled options')
    }
    
    setErrors(newErrors)
    return newErrors.length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsLoading(true)
    try {
      // Filter out empty options
      const validOptions = formData.options.filter(opt => opt.optionText.trim())
      
      const questionData = {
        questionText: formData.questionText.trim(),
        options: validOptions,
        difficulty: formData.difficulty,
        categoryId: formData.categoryId ? Number(formData.categoryId) : null
      }

      await onSave(questionData)
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to save question:', error)
      setErrors(['Failed to save question. Please try again.'])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {question ? 'Edit Question' : 'Add New Question'}
          </DialogTitle>
          <DialogDescription>
            {question 
              ? 'Update the question details below.'
              : 'Create a new question for your question bank.'
            }
          </DialogDescription>
        </DialogHeader>

        {errors.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <div className="flex items-center space-x-2 text-red-800 dark:text-red-200">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Please fix the following errors:</span>
            </div>
            <ul className="mt-2 text-sm text-red-700 dark:text-red-300 list-disc list-inside">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Question Text */}
          <div className="space-y-2">
            <Label htmlFor="question-text" className="text-sm font-medium">
              Question Text <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="question-text"
              placeholder="Enter your question..."
              value={formData.questionText}
              onChange={(e) => setFormData(prev => ({ ...prev, questionText: e.target.value }))}
              className="min-h-[80px]"
              required
            />
          </div>

          {/* Options */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">
              Answer Options <span className="text-red-500">*</span>
            </Label>
            <div className="space-y-3">
              {formData.options.map((option, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <input
                    type="radio"
                    name="correctAnswer"
                    checked={option.isCorrect}
                    onChange={() => handleCorrectAnswerChange(index)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <Label className="font-medium min-w-[20px]">
                    {String.fromCharCode(65 + index)}
                  </Label>
                  <Input
                    placeholder={`Option ${String.fromCharCode(65 + index)}`}
                    value={option.optionText}
                    onChange={(e) => handleOptionChange(index, 'optionText', e.target.value)}
                    className="flex-1"
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Select the radio button next to the correct answer. At least 2 options are required.
            </p>
          </div>

          {/* Difficulty */}
          <div className="space-y-2">
            <Label htmlFor="difficulty" className="text-sm font-medium">
              Difficulty
            </Label>
            <Select
              value={formData.difficulty}
              onValueChange={(value: 'EASY' | 'MEDIUM' | 'HARD') =>
                setFormData(prev => ({ ...prev, difficulty: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EASY">Easy</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HARD">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Category Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Category</Label>
            <Select
              value={formData.categoryId ? formData.categoryId.toString() : 'global'}
              onValueChange={(value) => 
                setFormData(prev => ({ 
                  ...prev, 
                  categoryId: value === 'global' ? null : parseInt(value) 
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category (optional for global questions)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">Global Question (No Category)</SelectItem>
                {(categories || [])
                  .filter(category => {
                    const isValid = category && 
                      category.id && 
                      typeof category.id === 'number' && 
                      category.id > 0 &&
                      category.name &&
                      typeof category.name === 'string' &&
                      category.name.trim() !== ''
                    
                    if (!isValid) {
                      console.warn('Filtered out invalid category:', category)
                    }
                    return isValid
                  })
                  .map((category) => {
                    const value = category.id.toString()
                    if (!value || value.trim() === '') {
                      console.error('Category has invalid ID:', category)
                      return null
                    }
                    return (
                      <SelectItem key={category.id} value={value}>
                        {category.name}
                      </SelectItem>
                    )
                  })
                  .filter(Boolean)
                }
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="flex space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : question ? 'Update Question' : 'Add Question'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
