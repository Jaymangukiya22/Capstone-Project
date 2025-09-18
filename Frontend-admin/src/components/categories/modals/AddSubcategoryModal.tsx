import { useState, useMemo } from "react"
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
import { generateParentOptions } from "@/utils/categoryUtils"

interface AddSubcategoryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddSubcategory: (name: string, parentId: string, parentType: 'category' | 'subcategory', description?: string) => void
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
  const [selectedParentId, setSelectedParentId] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Generate parent options (categories and subcategories) for the dropdown
  const parentOptions = useMemo(() => generateParentOptions(categories), [categories])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !selectedParentId) return

    const selectedParent = parentOptions.find(option => option.id === selectedParentId)
    if (!selectedParent) return

    setIsLoading(true)
    try {
      await onAddSubcategory(name.trim(), selectedParentId, selectedParent.type, description.trim() || undefined)
      setName("")
      setDescription("")
      setSelectedParentId("")
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
                Parent
              </Label>
              <Select value={selectedParentId} onValueChange={setSelectedParentId}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select parent category or subcategory" />
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
            <Button type="submit" disabled={isLoading || !name.trim() || !selectedParentId}>
              {isLoading ? "Adding..." : "Add Subcategory"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
