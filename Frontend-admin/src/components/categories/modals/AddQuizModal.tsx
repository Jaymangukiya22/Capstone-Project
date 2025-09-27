import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { FolderTree, Layers } from "lucide-react"
import type { QuizMode } from "@/types"
import type { Category } from "@/types/api"

interface AddQuizModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddQuiz: (name: string, mode: QuizMode, categoryId: string, description?: string, difficulty?: 'EASY' | 'MEDIUM' | 'HARD', timeLimit?: number) => void
  subcategoryId?: string
  categories?: Category[]
}

const quizModes: { value: QuizMode; label: string; description: string }[] = [
  // { value: "solo", label: "Solo Practice", description: "Individual practice mode" },
  { value: "1v1", label: "1v1 Battle", description: "Head-to-head competition" },
  { value: "play-with-friend", label: "Play with Friend", description: "Private game with friends" },
  { value: "multiplayer", label: "Multiplayer", description: "Multiple players competition" },
]

const difficultyLevels = [
  { value: 'EASY', label: 'Easy', color: 'bg-green-100 text-green-800' },
  { value: 'MEDIUM', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'HARD', label: 'Hard', color: 'bg-red-100 text-red-800' },
] as const

export function AddQuizModal({ 
  open, 
  onOpenChange, 
  onAddQuiz, 
  subcategoryId,
  categories = []
}: AddQuizModalProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [selectedMode, setSelectedMode] = useState<QuizMode | "">("")  
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM')
  const [timeLimit, setTimeLimit] = useState<number>(30)
  const [isLoading, setIsLoading] = useState(false)

  // Find the selected category/subcategory
  const selectedCategory = categories.find(cat => cat.id.toString() === subcategoryId)
  const isParentCategory = selectedCategory && !selectedCategory.parentId
  const parentCategory = selectedCategory?.parentId 
    ? categories.find(cat => cat.id === selectedCategory.parentId)
    : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !selectedMode || !subcategoryId) return

    setIsLoading(true)
    try {
      await onAddQuiz(
        name.trim(), 
        selectedMode, 
        subcategoryId, 
        description.trim() || undefined,
        difficulty,
        timeLimit
      )
      // Reset form
      setName("")
      setDescription("")
      setSelectedMode("")
      setDifficulty('MEDIUM')
      setTimeLimit(30)
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to add quiz:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Quiz</DialogTitle>
          <DialogDescription>
            Create a new quiz in the selected category. Choose the appropriate quiz mode and settings for your audience.
          </DialogDescription>
          {selectedCategory && (
            <div className="flex items-center space-x-2 mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              {isParentCategory ? (
                <FolderTree className="h-4 w-4 text-blue-600" />
              ) : (
                <Layers className="h-4 w-4 text-orange-600" />
              )}
              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  {isParentCategory ? 'Category' : 'Subcategory'}: {selectedCategory.name}
                </span>
                {parentCategory && (
                  <span className="text-xs text-gray-500">
                    Under: {parentCategory.name}
                  </span>
                )}
              </div>
            </div>
          )}
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quiz-name" className="text-right">
                Name *
              </Label>
              <Input
                id="quiz-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                placeholder="Enter quiz name"
                required
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quiz-description" className="text-right">
                Description
              </Label>
              <Textarea
                id="quiz-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="col-span-3"
                placeholder="Enter description (optional)"
                rows={2}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quiz-mode" className="text-right">
                Mode *
              </Label>
              <Select value={selectedMode} onValueChange={(value: QuizMode) => setSelectedMode(value)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select quiz mode" />
                </SelectTrigger>
                <SelectContent>
                  {quizModes.map((mode) => (
                    <SelectItem key={mode.value} value={mode.value}>
                      <div className="flex flex-col">
                        <span className="font-medium">{mode.label}</span>
                        <span className="text-xs text-gray-500">{mode.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quiz-difficulty" className="text-right">
                Difficulty
              </Label>
              <Select value={difficulty} onValueChange={(value: 'EASY' | 'MEDIUM' | 'HARD') => setDifficulty(value)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {difficultyLevels.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      <div className="flex items-center space-x-2">
                        <Badge className={level.color} variant="secondary">
                          {level.label}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quiz-time-limit" className="text-right">
                Time Limit
              </Label>
              <div className="col-span-3 flex items-center space-x-2">
                <Input
                  id="quiz-time-limit"
                  type="number"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(parseInt(e.target.value) || 30)}
                  className="flex-1"
                  min={10}
                  max={300}
                />
                <span className="text-sm text-gray-500">seconds</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim() || !selectedMode}>
              {isLoading ? "Creating Quiz..." : "Create Quiz"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
