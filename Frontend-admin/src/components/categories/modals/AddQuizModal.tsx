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
import type { QuizMode } from "@/types"

interface AddQuizModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddQuiz: (name: string, mode: QuizMode, subcategoryId: string, description?: string) => void
  subcategoryId?: string
}

const quizModes: { value: QuizMode; label: string }[] = [
  { value: "1v1", label: "1v1 Battle" },
  { value: "play-with-friend", label: "Play with Friend" },
  { value: "multiplayer", label: "Multiplayer" },
]

export function AddQuizModal({ 
  open, 
  onOpenChange, 
  onAddQuiz, 
  subcategoryId 
}: AddQuizModalProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [selectedMode, setSelectedMode] = useState<QuizMode | "">("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !selectedMode || !subcategoryId) return

    setIsLoading(true)
    try {
      await onAddQuiz(name.trim(), selectedMode, subcategoryId, description.trim() || undefined)
      setName("")
      setDescription("")
      setSelectedMode("")
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
            Create a new quiz in the selected subcategory. Choose the appropriate quiz mode for your audience.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quiz-name" className="text-right">
                Name
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
              <Label htmlFor="quiz-mode" className="text-right">
                Mode
              </Label>
              <Select value={selectedMode} onValueChange={(value: QuizMode) => setSelectedMode(value)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select quiz mode" />
                </SelectTrigger>
                <SelectContent>
                  {quizModes.map((mode) => (
                    <SelectItem key={mode.value} value={mode.value}>
                      {mode.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quiz-description" className="text-right">
                Description
              </Label>
              <Input
                id="quiz-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="col-span-3"
                placeholder="Enter description (optional)"
              />
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
              {isLoading ? "Adding..." : "Add Quiz"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
