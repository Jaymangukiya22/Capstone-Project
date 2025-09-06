import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { GripVertical, Eye, Edit, Trash2 } from "lucide-react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { Question } from "@/types/question"

interface QuestionCardProps {
  question: Question
  index: number
  isSelected: boolean
  onSelect: (checked: boolean) => void
  onEdit: () => void
  onDelete: () => void
}

export function QuestionCard({ 
  question, 
  index, 
  isSelected, 
  onSelect, 
  onEdit, 
  onDelete 
}: QuestionCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const correctOption = question.options.find(opt => opt.id === question.correctOptionId)

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'hard': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  return (
    <Card 
      ref={setNodeRef}
      style={style}
      className={`transition-all duration-200 ${
        isDragging ? 'opacity-50 rotate-2 scale-105 z-50' : ''
      } ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50/50 dark:bg-blue-950/20' : 'hover:shadow-md'}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start space-x-4">
          {/* Drag Handle */}
          <div className="flex items-center space-x-3 mt-1">
            <GripVertical 
              className="h-4 w-4 text-gray-400 cursor-grab hover:text-gray-600 active:cursor-grabbing" 
              {...attributes}
              {...listeners}
            />
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelect}
              aria-label={`Select question ${index + 1}`}
            />
          </div>

          {/* Question Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white leading-5">
                {question.text || "Untitled Question"}
              </h3>
              <div className="flex items-center space-x-2 ml-4">
                <Badge variant="secondary" className={getDifficultyColor(question.difficulty)}>
                  {question.difficulty}
                </Badge>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {question.points} pts
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {question.timeLimit}s
                </span>
              </div>
            </div>

            {/* Tags */}
            {question.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {question.tags.map((tag, tagIndex) => (
                  <Badge key={tagIndex} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Options */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              {question.options.map((option, optIndex) => (
                <div 
                  key={option.id}
                  className={`text-xs p-2 rounded border ${
                    option.id === question.correctOptionId
                      ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400'
                      : 'bg-gray-50 border-gray-200 text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300'
                  }`}
                >
                  <span className="font-medium">
                    {String.fromCharCode(65 + optIndex)}.
                  </span>{' '}
                  {option.text || `Option ${String.fromCharCode(65 + optIndex)}`}
                </div>
              ))}
            </div>

            {/* Question Type */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs">
                  {question.type === 'multiple-choice' ? 'Multiple Choice' : 'True/False'}
                </Badge>
                {correctOption && (
                  <span className="text-xs text-green-600 dark:text-green-400">
                    Correct: {correctOption.text}
                  </span>
                )}
              </div>
              
              {/* Actions */}
              <div className="flex items-center space-x-1">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onEdit}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700" 
                  onClick={onDelete}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
