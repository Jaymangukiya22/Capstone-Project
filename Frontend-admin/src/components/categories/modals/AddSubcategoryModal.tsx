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
import type { Category } from "@/types"

interface AddSubcategoryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddSubcategory: (name: string, categoryId: string, description?: string) => void
  categories: Category[]
}

export function AddSubcategoryModal({ 
  open, 
  onOpenChange, 
  onAddSubcategory, 
  categories 
}: AddSubcategoryModalProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [selectedCategoryId, setSelectedCategoryId] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !selectedCategoryId) return

    setIsLoading(true)
    try {
      await onAddSubcategory(name.trim(), selectedCategoryId, description.trim() || undefined)
      setName("")
      setDescription("")
      setSelectedCategoryId("")
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to add subcategory:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Subcategory</DialogTitle>
          <DialogDescription>
            Create a new subcategory under an existing category. Subcategories help organize quizzes more specifically.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="subcategory-name" className="text-right">
                Name
              </Label>
              <Input
                id="subcategory-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                placeholder="Enter subcategory name"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="parent-category" className="text-right">
                Category
              </Label>
              <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select parent category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="subcategory-description" className="text-right">
                Description
              </Label>
              <Input
                id="subcategory-description"
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
            <Button type="submit" disabled={isLoading || !name.trim() || !selectedCategoryId}>
              {isLoading ? "Adding..." : "Add Subcategory"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
