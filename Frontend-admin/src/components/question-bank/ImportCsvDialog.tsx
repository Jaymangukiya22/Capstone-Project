import React, { useState, useRef } from "react"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select"
import { Upload, Download, AlertCircle, CheckCircle } from "lucide-react"
import * as XLSX from "xlsx"
import { useCategories } from "../../hooks/useCategories"

interface ImportCsvDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportComplete: () => void
  selectedCategoryId?: number
}

export function ImportCsvDialog({ 
  open, 
  onOpenChange, 
  onImportComplete, 
  selectedCategoryId 
}: ImportCsvDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadResult, setUploadResult] = useState<any>(null)
  const [targetCategoryId, setTargetCategoryId] = useState<number | null>(selectedCategoryId || null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const { categories: apiCategories } = useCategories()

  const downloadTemplate = () => {
    const templateData = [
      {
        question: "Fastest language",
        option_a: "C++",
        option_b: "C", 
        option_c: "Java",
        option_d: "Python",
        correct_answer: "option_b"
      }
    ]

    const ws = XLSX.utils.json_to_sheet(templateData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Questions")
    XLSX.writeFile(wb, "question_import_template.xlsx")
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!targetCategoryId) {
      setError('Please select a category first')
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      
      const formData = new FormData()
      formData.append('file', file)
      formData.append('categoryId', targetCategoryId.toString())
      
      const response = await fetch('http://localhost:3000/api/question-bank/upload-excel', {
        method: 'POST',
        body: formData
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.message || 'Upload failed')
      }
      
      setUploadResult(result)
      onImportComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Questions from CSV/XLSX</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-3">
            <Label>Target Category</Label>
            <Select 
              value={targetCategoryId?.toString() || ''} 
              onValueChange={(value) => setTargetCategoryId(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {apiCategories?.filter(category => category.id && category.id.toString().trim() !== '').map((category: any) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <div className="space-y-2">
              <Label htmlFor="file-upload" className="cursor-pointer">
                <span className="text-sm font-medium text-blue-600 hover:text-blue-500">
                  Choose a file
                </span>
                <span className="text-sm text-gray-500"> or drag and drop</span>
              </Label>
              <Input
                ref={fileInputRef}
                id="file-upload"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
              <p className="text-xs text-gray-500">CSV, XLSX files up to 5MB</p>
            </div>
          </div>

          <div className="space-y-4">
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>

            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <p className="font-medium">Required columns:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><code>question</code> - The question text</li>
                <li><code>option_a</code>, <code>option_b</code>, <code>option_c</code>, <code>option_d</code> - Answer options</li>
                <li><code>correct_answer</code> - Must be: option_a, option_b, option_c, or option_d</li>
              </ul>
            </div>
          </div>

          {isLoading && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm text-blue-700 dark:text-blue-400">Uploading...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm text-red-700 dark:text-red-400">{error}</span>
              </div>
            </div>
          )}

          {uploadResult && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">
                    Upload completed successfully!
                  </span>
                </div>
                <div className="text-sm text-green-600 dark:text-green-400 space-y-1">
                  <p>• Total rows: {uploadResult.summary?.totalRows || 'N/A'}</p>
                  <p>• Successfully imported: {uploadResult.summary?.successfulImports || 'N/A'}</p>
                  <p>• Failed: {uploadResult.summary?.failedImports || 0}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end pt-4 border-t space-x-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {uploadResult ? 'Close' : 'Cancel'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}