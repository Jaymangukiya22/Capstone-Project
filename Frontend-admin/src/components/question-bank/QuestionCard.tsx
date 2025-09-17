import { useState } from 'react'
import { Eye, Edit, Trash2, Clock, Award } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { getDifficultyColor } from '@/utils/questionUtils'
import type { Question } from '@/types'

interface QuestionCardProps {
  question: Question
  isSelected: boolean
  onSelect: (questionId: string, selected: boolean) => void
  onPreview: (question: Question) => void
  onEdit: (question: Question) => void
  onDelete: (questionId: string) => void
}

export function QuestionCard({
  question,
  isSelected,
  onSelect,
  onPreview,
  onEdit,
  onDelete
}: QuestionCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const handleCheckboxChange = (checked: boolean) => {
    onSelect(question.id, checked)
  }

  return (
    <div
      className={cn(
        "group relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 transition-all duration-200",
        isSelected && "ring-2 ring-blue-500 border-blue-300",
        "hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header with checkbox and actions */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <Checkbox
            checked={isSelected}
            onCheckedChange={handleCheckboxChange}
            className="mt-1"
          />
          <div className="flex items-center space-x-2">
            <Badge className={getDifficultyColor(question.difficulty)}>
              {question.difficulty}
            </Badge>
            <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
              <Award className="h-3 w-3" />
              <span>{question.points} pts</span>
            </div>
            <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
              <Clock className="h-3 w-3" />
              <span>{question.timeLimit}s</span>
            </div>
          </div>
        </div>
        
        {/* Action buttons - visible on hover */}
        <div className={cn(
          "flex items-center space-x-1 transition-opacity duration-200",
          isHovered ? "opacity-100" : "opacity-0"
        )}>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            onClick={() => onPreview(question)}
            title="Preview"
          >
            <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-gray-50 dark:hover:bg-gray-700"
            onClick={() => onEdit(question)}
            title="Edit"
          >
            <Edit className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-red-50 dark:hover:bg-red-900/20"
            onClick={() => onDelete(question.id)}
            title="Delete"
          >
            <Trash2 className="h-4 w-4 text-red-500 dark:text-red-400" />
          </Button>
        </div>
      </div>

      {/* Question text */}
      <div className="mb-4">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-relaxed">
          {question.text}
        </p>
      </div>

      {/* Options */}
      <div className="space-y-2 mb-4">
        {Object.entries(question.options).map(([key, value]) => (
          <div
            key={key}
            className={cn(
              "flex items-center space-x-2 p-2 rounded border text-sm",
              question.correctOption === key
                ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300"
                : "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300"
            )}
          >
            <span className={cn(
              "flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium",
              question.correctOption === key
                ? "bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200"
                : "bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400"
            )}>
              {key}
            </span>
            <span className="flex-1">{value}</span>
            {question.correctOption === key && (
              <div className="text-green-600 dark:text-green-400 text-xs font-medium">
                ✓ Correct
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Tags */}
      {question.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {question.tags.map((tag, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
            >
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
