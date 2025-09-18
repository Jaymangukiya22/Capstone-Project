import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'
import { generateParentOptions } from '@/utils/categoryUtils'
import type { Question, Category } from '@/types'

interface AddEditQuestionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  question?: Question // undefined for add, Question for edit
  categories: Category[]
  selectedNodeId?: string | null
  selectedNodeType?: 'category' | 'subcategory' | 'global'
  onSave: (questionData: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>) => void
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
    text: '',
    options: { A: '', B: '', C: '', D: '' },
    correctOption: 'A' as 'A' | 'B' | 'C' | 'D',
    difficulty: 'easy' as 'easy' | 'intermediate' | 'hard',
    points: 5,
    timeLimit: 30,
    tags: [] as string[],
    categoryId: '',
    subcategoryId: '',
    isGlobal: false
  })
  
  const [tagInput, setTagInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Generate parent options for category selection
  const parentOptions = useMemo(() => generateParentOptions(categories), [categories])

  // Initialize form data when question changes
  useEffect(() => {
    if (question) {
      setFormData({
        text: question.text,
        options: question.options,
        correctOption: question.correctOption,
        difficulty: question.difficulty,
        points: question.points,
        timeLimit: question.timeLimit,
        tags: question.tags,
        categoryId: question.categoryId || '',
        subcategoryId: question.subcategoryId || '',
        isGlobal: !question.categoryId
      })
    } else {
      // Reset form for new question - pre-populate with selected node
      let initialCategoryId = ''
      let initialSubcategoryId = ''
      let initialIsGlobal = true

      if (selectedNodeId && selectedNodeType !== 'global') {
        initialIsGlobal = false
        if (selectedNodeType === 'category') {
          initialCategoryId = selectedNodeId
        } else if (selectedNodeType === 'subcategory') {
          initialSubcategoryId = selectedNodeId
          // Find the parent category for this subcategory
          const parentCategory = categories.find(cat => 
            cat.subcategories.some(sub => sub.id === selectedNodeId)
          )
          if (parentCategory) {
            initialCategoryId = parentCategory.id
          }
        }
      }

      setFormData({
        text: '',
        options: { A: '', B: '', C: '', D: '' },
        correctOption: 'A',
        difficulty: 'easy',
        points: 5,
        timeLimit: 30,
        tags: [],
        categoryId: initialCategoryId,
        subcategoryId: initialSubcategoryId,
        isGlobal: initialIsGlobal
      })
    }
    setTagInput('')
  }, [question, open, selectedNodeId, selectedNodeType, categories])

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleOptionChange = (option: 'A' | 'B' | 'C' | 'D', value: string) => {
    setFormData(prev => ({
      ...prev,
      options: { ...prev.options, [option]: value }
    }))
  }

  const handleGlobalChange = (isGlobal: boolean) => {
    setFormData(prev => ({
      ...prev,
      isGlobal,
      categoryId: isGlobal ? '' : prev.categoryId,
      subcategoryId: isGlobal ? '' : prev.subcategoryId
    }))
  }

  const handleCategoryChange = (parentId: string) => {
    const selectedParent = parentOptions.find(option => option.id === parentId)
    if (selectedParent) {
      if (selectedParent.type === 'category') {
        setFormData(prev => ({
          ...prev,
          categoryId: parentId,
          subcategoryId: ''
        }))
      } else {
        // It's a subcategory
        const category = categories.find(cat => 
          cat.subcategories.some(sub => sub.id === parentId)
        )
        setFormData(prev => ({
          ...prev,
          categoryId: category?.id || '',
          subcategoryId: parentId
        }))
      }
    }
  }

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }))
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  const validateForm = () => {
    if (!formData.text.trim()) return false
    if (!formData.options.A.trim() || !formData.options.B.trim() || 
        !formData.options.C.trim() || !formData.options.D.trim()) return false
    if (formData.points < 1 || formData.timeLimit < 10) return false
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsLoading(true)
    try {
      const questionData = {
        text: formData.text.trim(),
        options: formData.options,
        correctOption: formData.correctOption,
        difficulty: formData.difficulty,
        points: formData.points,
        timeLimit: formData.timeLimit,
        tags: formData.tags,
        categoryId: formData.isGlobal ? undefined : formData.categoryId || undefined,
        subcategoryId: formData.isGlobal ? undefined : formData.subcategoryId || undefined
      }

      await onSave(questionData)
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to save question:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    if (question) {
      // Reset to original question data
      setFormData({
        text: question.text,
        options: question.options,
        correctOption: question.correctOption,
        difficulty: question.difficulty,
        points: question.points,
        timeLimit: question.timeLimit,
        tags: question.tags,
        categoryId: question.categoryId || '',
        subcategoryId: question.subcategoryId || '',
        isGlobal: !question.categoryId
      })
    } else {
      // Reset to empty form
      setFormData({
        text: '',
        options: { A: '', B: '', C: '', D: '' },
        correctOption: 'A',
        difficulty: 'easy',
        points: 5,
        timeLimit: 30,
        tags: [],
        categoryId: '',
        subcategoryId: '',
        isGlobal: false
      })
    }
    setTagInput('')
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

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Question Text */}
          <div className="space-y-2">
            <Label htmlFor="question-text" className="text-sm font-medium">
              Question Text <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="question-text"
              placeholder="Enter your question..."
              value={formData.text}
              onChange={(e) => handleInputChange('text', e.target.value)}
              className="min-h-[80px]"
              required
            />
          </div>

          {/* Options */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">
              Answer Options <span className="text-red-500">*</span>
            </Label>
            <RadioGroup
              value={formData.correctOption}
              onValueChange={(value) => handleInputChange('correctOption', value)}
            >
              {(['A', 'B', 'C', 'D'] as const).map((option) => (
                <div key={option} className="flex items-center space-x-3">
                  <RadioGroupItem value={option} id={`option-${option}`} />
                  <Label htmlFor={`option-${option}`} className="font-medium">
                    {option}
                  </Label>
                  <Input
                    placeholder={`Option ${option}`}
                    value={formData.options[option]}
                    onChange={(e) => handleOptionChange(option, e.target.value)}
                    className="flex-1"
                    required
                  />
                </div>
              ))}
            </RadioGroup>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Select the radio button next to the correct answer
            </p>
          </div>

          {/* Question Settings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="difficulty" className="text-sm font-medium">
                Difficulty
              </Label>
              <Select
                value={formData.difficulty}
                onValueChange={(value: 'easy' | 'intermediate' | 'hard') => 
                  handleInputChange('difficulty', value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="points" className="text-sm font-medium">
                Points
              </Label>
              <Input
                id="points"
                type="number"
                min="1"
                max="100"
                value={formData.points}
                onChange={(e) => handleInputChange('points', parseInt(e.target.value) || 5)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeLimit" className="text-sm font-medium">
                Time Limit (seconds)
              </Label>
              <Input
                id="timeLimit"
                type="number"
                min="10"
                max="300"
                value={formData.timeLimit}
                onChange={(e) => handleInputChange('timeLimit', parseInt(e.target.value) || 30)}
              />
            </div>
          </div>

          {/* Category Selection */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="global-question"
                checked={formData.isGlobal}
                onCheckedChange={handleGlobalChange}
              />
              <Label htmlFor="global-question" className="text-sm font-medium">
                Global Question (No Category)
              </Label>
            </div>

            {!formData.isGlobal && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Category</Label>
                <Select
                  value={formData.subcategoryId || formData.categoryId}
                  onValueChange={handleCategoryChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category or subcategory" />
                  </SelectTrigger>
                  <SelectContent>
                    {parentOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Tags</Label>
            <div className="flex space-x-2">
              <Input
                placeholder="Add a tag..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
              />
              <Button type="button" onClick={addTag} variant="outline">
                Add
              </Button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags.map((tag, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="flex items-center space-x-1"
                  >
                    <span>{tag}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => removeTag(tag)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="flex space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={isLoading}
            >
              Reset
            </Button>
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
              disabled={isLoading || !validateForm()}
            >
              {isLoading ? 'Saving...' : question ? 'Update Question' : 'Add Question'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
