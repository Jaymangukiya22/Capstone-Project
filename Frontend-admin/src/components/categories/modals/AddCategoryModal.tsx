import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { FolderTree, X } from "lucide-react"
import type { Category } from "@/types"

interface AddCategoryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddCategory: (name: string, description?: string, parentId?: string) => void
  categories: Category[]
}

export function AddCategoryModal({ open, onOpenChange, onAddCategory, categories }: AddCategoryModalProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [parentId, setParentId] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!name.trim()) return

    setIsLoading(true)
    try {
      const finalParentId = parentId === "none" ? undefined : parentId || undefined
      await onAddCategory(name.trim(), description.trim() || undefined, finalParentId)
      setName("")
      setDescription("")
      setParentId("")
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to add category:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setName("")
    setDescription("")
    setParentId("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 gap-0 bg-white dark:bg-gray-900 border-0 shadow-2xl">
        <DialogHeader className="px-6 pt-6 pb-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <FolderTree className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Create Category
              </DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription className="text-gray-600 dark:text-gray-400 text-base">
            Add a new category to organize your quizzes
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="category-name" className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Category Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="category-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter category name"
              className="h-12 text-base border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category-description" className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Description
            </Label>
            <Textarea
              id="category-description"
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              placeholder="Enter category description (optional)"
              className="min-h-[80px] text-base border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500 resize-none"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="parent-category" className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Parent Category
            </Label>
            <Select value={parentId} onValueChange={setParentId}>
              <SelectTrigger className="h-12 text-base border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500">
                <SelectValue placeholder="Select parent category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (Root Category)</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 h-11 text-base font-medium border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={isLoading || !name.trim()}
              className="flex-1 h-11 text-base font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            >
              {isLoading ? "Creating..." : "Add Category"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
