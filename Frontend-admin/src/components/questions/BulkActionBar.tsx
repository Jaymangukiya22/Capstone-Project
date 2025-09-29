import { Button } from "@/components/ui/button"
import { Trash2, X, Download } from "lucide-react"

interface BulkActionBarProps {
  selectedCount: number
  onDelete: () => void
  onDeselect: () => void
}

export function BulkActionBar({ selectedCount, onDelete, onDeselect }: BulkActionBarProps) {
  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg px-4 py-3">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {selectedCount} question{selectedCount !== 1 ? 's' : ''} selected
          </span>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={onDeselect}>
              <X className="mr-2 h-4 w-4" />
              Deselect
            </Button>
            
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={onDelete}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
