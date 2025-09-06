import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { RotateCcw, Save, X, Plus } from "lucide-react"
import type { Question, QuestionOption } from "@/types/question"

interface EditQuestionModalProps {
  question: Question | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (question: Question) => void
}

interface FormData {
  text: string
  options: QuestionOption[]
  correctOptionId: string
  difficulty: 'easy' | 'intermediate' | 'hard'
  tags: string
  points: number
  timeLimit: number
}

export function EditQuestionModal({ question, open, onOpenChange, onSave }: EditQuestionModalProps) {
  const [formData, setFormData] = useState<FormData>({
    text: "",
    options: [
      { id: "a", text: "" },
      { id: "b", text: "" },
      { id: "c", text: "" },
      { id: "d", text: "" }
    ],
    correctOptionId: "",
    difficulty: "easy",
    tags: "",
    points: 10,
    timeLimit: 30
  })

  const [originalData, setOriginalData] = useState<FormData | null>(null)

  useEffect(() => {
    if (question && open) {
      const data: FormData = {
        text: question.text,
        options: [...question.options],
        correctOptionId: question.correctOptionId,
        difficulty: question.difficulty,
        tags: question.tags.join(", "),
        points: question.points,
        timeLimit: question.timeLimit
      }
      setFormData(data)
      setOriginalData(data)
    } else if (!question && open) {
      // New question
      const newData: FormData = {
        text: "",
        options: [
          { id: `${Date.now()}_a`, text: "" },
          { id: `${Date.now()}_b`, text: "" },
          { id: `${Date.now()}_c`, text: "" },
          { id: `${Date.now()}_d`, text: "" }
        ],
        correctOptionId: "",
        difficulty: "easy",
        tags: "",
        points: 10,
        timeLimit: 30
      }
      setFormData(newData)
      setOriginalData(newData)
    }
  }, [question, open])

  const handleOptionChange = (index: number, text: string) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => 
        i === index ? { ...opt, text } : opt
      )
    }))
  }

  const handleCorrectOptionChange = (optionId: string) => {
    setFormData(prev => ({
      ...prev,
      correctOptionId: optionId
    }))
  }

  const handleReset = () => {
    if (originalData) {
      setFormData({ ...originalData })
    }
  }

  const handleSave = () => {
    const tagsArray = formData.tags
      .split(",")
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)

    const updatedQuestion: Question = {
      id: question?.id || `${Date.now()}_${Math.random()}`,
      text: formData.text,
      options: formData.options,
      correctOptionId: formData.correctOptionId,
      type: "multiple-choice",
      difficulty: formData.difficulty,
      tags: tagsArray,
      points: formData.points,
      timeLimit: formData.timeLimit,
      createdAt: question?.createdAt || new Date(),
      updatedAt: new Date()
    }

    onSave(updatedQuestion)
  }

  const isValid = 
    formData.text.trim() &&
    formData.options.every(opt => opt.text.trim()) &&
    formData.correctOptionId &&
    formData.points > 0 &&
    formData.timeLimit > 0

  const isNewQuestion = !question?.id

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isNewQuestion ? "Add New Question" : "Edit Question"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Question Text */}
          <div className="space-y-2">
            <Label htmlFor="question-text" className="text-sm font-medium">
              Question Text <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="question-text"
              placeholder="Enter your question here..."
              value={formData.text}
              onChange={(e) => setFormData(prev => ({ ...prev, text: e.target.value }))}
              className="min-h-[100px] resize-none"
            />
          </div>

          {/* Options */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">
              Answer Options <span className="text-red-500">*</span>
            </Label>
            
            <RadioGroup
              value={formData.correctOptionId}
              onValueChange={handleCorrectOptionChange}
              className="space-y-3"
            >
              {formData.options.map((option, index) => (
                <div key={option.id} className="flex items-center space-x-3">
                  <RadioGroupItem
                    value={option.id}
                    id={`option-${index}`}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label htmlFor={`option-input-${index}`} className="text-sm font-medium">
                      Option {String.fromCharCode(65 + index)}
                    </Label>
                    <Input
                      id={`option-input-${index}`}
                      placeholder={`Enter option ${String.fromCharCode(65 + index)}`}
                      value={option.text}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              ))}
            </RadioGroup>
            
            <p className="text-xs text-gray-500">
              Select the radio button next to the correct answer
            </p>
          </div>

          {/* Question Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="difficulty" className="text-sm font-medium">
                Difficulty
              </Label>
              <Select
                value={formData.difficulty}
                onValueChange={(value: 'easy' | 'intermediate' | 'hard') => 
                  setFormData(prev => ({ ...prev, difficulty: value }))
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
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  points: parseInt(e.target.value) || 10 
                }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="time-limit" className="text-sm font-medium">
                Time Limit (seconds)
              </Label>
              <Input
                id="time-limit"
                type="number"
                min="10"
                max="300"
                value={formData.timeLimit}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  timeLimit: parseInt(e.target.value) || 30 
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags" className="text-sm font-medium">
                Tags
              </Label>
              <Input
                id="tags"
                placeholder="Enter tags separated by commas"
                value={formData.tags}
                onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
              />
            </div>
          </div>

          {/* Tags Preview */}
          {formData.tags && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Tags Preview</Label>
              <div className="flex flex-wrap gap-1">
                {formData.tags
                  .split(",")
                  .map(tag => tag.trim())
                  .filter(tag => tag.length > 0)
                  .map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
              </div>
            </div>
          )}

          {/* Validation Messages */}
          {!isValid && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
              <p className="text-sm text-yellow-700 dark:text-yellow-400 font-medium mb-1">
                Please complete the following:
              </p>
              <ul className="text-xs text-yellow-600 dark:text-yellow-400 space-y-1">
                {!formData.text.trim() && <li>• Question text is required</li>}
                {!formData.options.every(opt => opt.text.trim()) && <li>• All option texts are required</li>}
                {!formData.correctOptionId && <li>• Select the correct answer</li>}
                {formData.points <= 0 && <li>• Points must be greater than 0</li>}
                {formData.timeLimit <= 0 && <li>• Time limit must be greater than 0</li>}
              </ul>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-6 border-t">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!isValid}>
              <Save className="mr-2 h-4 w-4" />
              {isNewQuestion ? "Add Question" : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
