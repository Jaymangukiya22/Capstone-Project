import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Upload, Download, AlertCircle, CheckCircle, X } from "lucide-react"
import Papa from "papaparse"
import * as XLSX from "xlsx"
import type { Question } from "@/types"

interface ImportRow {
  question: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: string
  difficulty?: string
  points?: string
  time_limit?: string
  tags?: string
}

interface ParsedRow extends ImportRow {
  rowIndex: number
  isValid: boolean
  errors: string[]
  isSelected: boolean
}

interface ImportCsvDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (questions: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>[]) => void
}

export function ImportCsvDialog({ open, onOpenChange, onImport }: ImportCsvDialogProps) {
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const downloadTemplate = (format: 'csv' | 'xlsx') => {
    const templateData = [
      {
        question: "What is the capital of France?",
        option_a: "Paris",
        option_b: "London", 
        option_c: "Berlin",
        option_d: "Madrid",
        correct_answer: "A",
        difficulty: "easy",
        points: "5",
        time_limit: "30",
        tags: "geography,europe"
      },
      {
        question: "Which language runs in web browsers?",
        option_a: "Java",
        option_b: "C++",
        option_c: "Python", 
        option_d: "JavaScript",
        correct_answer: "D",
        difficulty: "intermediate",
        points: "10",
        time_limit: "45",
        tags: "programming,web"
      }
    ]

    if (format === 'csv' || format === 'xlsx') {
      const csv = Papa.unparse(templateData)
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'question_bank_template.csv'
      a.click()
      URL.revokeObjectURL(url)
    } else {
      const ws = XLSX.utils.json_to_sheet(templateData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Questions")
      XLSX.writeFile(wb, "question_bank_template.xlsx")
    }
  }

  const validateRow = (row: ImportRow, _index: number): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []

    if (!row.question?.trim()) {
      errors.push("Question text is required")
    }

    if (!row.option_a?.trim()) errors.push("Option A is required")
    if (!row.option_b?.trim()) errors.push("Option B is required") 
    if (!row.option_c?.trim()) errors.push("Option C is required")
    if (!row.option_d?.trim()) errors.push("Option D is required")

    const validAnswers = ['a', 'b', 'c', 'd', 'option_a', 'option_b', 'option_c', 'option_d']
    const correctAnswer = row.correct_answer?.toLowerCase()?.trim()
    if (!validAnswers.includes(correctAnswer)) {
      errors.push("Correct answer must be: A, B, C, D or option_a, option_b, option_c, option_d")
    }

    // Validate optional fields
    if (row.difficulty && !['easy', 'intermediate', 'hard'].includes(row.difficulty.toLowerCase())) {
      errors.push("Difficulty must be: easy, intermediate, or hard")
    }

    if (row.points && (isNaN(Number(row.points)) || Number(row.points) < 1)) {
      errors.push("Points must be a positive number")
    }

    if (row.time_limit && (isNaN(Number(row.time_limit)) || Number(row.time_limit) < 10)) {
      errors.push("Time limit must be at least 10 seconds")
    }

    return { isValid: errors.length === 0, errors }
  }

  const parseFile = async (file: File) => {
    setIsLoading(true)
    setError(null)

    try {
      let data: any[]

      if (file.name.endsWith('.csv')) {
        const text = await file.text()
        const result = Papa.parse(text, { header: true, skipEmptyLines: true })
        
        if (result.errors.length > 0) {
          throw new Error(`CSV parsing error: ${result.errors[0].message}`)
        }
        
        data = result.data
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const buffer = await file.arrayBuffer()
        const workbook = XLSX.read(buffer)
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]
        data = XLSX.utils.sheet_to_json(worksheet)
      } else {
        throw new Error("Unsupported file format. Please use CSV or XLSX files.")
      }

      // Validate headers
      const requiredHeaders = ['question', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer']
      const headers = Object.keys(data[0] || {}).map(h => h.toLowerCase())
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))
      
      if (missingHeaders.length > 0) {
        throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`)
      }

      // Normalize and validate rows
      const normalizedRows: ParsedRow[] = data.map((row: any, index: number) => {
        const normalizedRow: ImportRow = {
          question: row.question || row.Question || '',
          option_a: row.option_a || row.Option_A || '',
          option_b: row.option_b || row.Option_B || '',
          option_c: row.option_c || row.Option_C || '',
          option_d: row.option_d || row.Option_D || '',
          correct_answer: (row.correct_answer || row.Correct_Answer || '').toUpperCase(),
          difficulty: (row.difficulty || row.Difficulty || 'easy').toLowerCase(),
          points: row.points || row.Points || '5',
          time_limit: row.time_limit || row.Time_Limit || '30',
          tags: row.tags || row.Tags || ''
        }

        const validation = validateRow(normalizedRow, index)
        
        return {
          ...normalizedRow,
          rowIndex: index,
          isValid: validation.isValid,
          errors: validation.errors,
          isSelected: validation.isValid
        }
      })

      setParsedRows(normalizedRows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("File size must be less than 5MB")
        return
      }
      parseFile(file)
    }
  }

  const toggleRowSelection = (index: number) => {
    setParsedRows(prev => prev.map((row, i) => 
      i === index ? { ...row, isSelected: !row.isSelected } : row
    ))
  }

  const handleImport = () => {
    const selectedValidRows = parsedRows.filter(row => row.isSelected && row.isValid)
    
    const questions: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>[] = selectedValidRows.map(row => {
      // Handle both formats: "A"/"B"/"C"/"D" and "option_a"/"option_b"/"option_c"/"option_d"
      let correctOption: 'A' | 'B' | 'C' | 'D'
      const answer = row.correct_answer.toLowerCase().trim()
      
      if (['a', 'b', 'c', 'd'].includes(answer)) {
        correctOption = answer.toUpperCase() as 'A' | 'B' | 'C' | 'D'
      } else if (answer === 'option_a') {
        correctOption = 'A'
      } else if (answer === 'option_b') {
        correctOption = 'B'
      } else if (answer === 'option_c') {
        correctOption = 'C'
      } else if (answer === 'option_d') {
        correctOption = 'D'
      } else {
        correctOption = 'A' // fallback
      }
      
      return {
        text: row.question,
        options: {
          A: row.option_a,
          B: row.option_b,
          C: row.option_c,
          D: row.option_d
        },
        correctOption,
        difficulty: (row.difficulty || 'easy') as 'easy' | 'intermediate' | 'hard',
        points: parseInt(row.points || '5'),
        timeLimit: parseInt(row.time_limit || '30'),
        tags: row.tags ? row.tags.split(',').map(tag => tag.trim()).filter(Boolean) : []
      }
    })

    onImport(questions)
    
    // Reset and close
    setParsedRows([])
    setSelectedRowIndex(null)
    setError(null)
    onOpenChange(false)
  }

  const validRows = parsedRows.filter(row => row.isValid)
  const invalidRows = parsedRows.filter(row => !row.isValid)
  const selectedRows = parsedRows.filter(row => row.isSelected && row.isValid)
  const selectedRow = selectedRowIndex !== null ? parsedRows[selectedRowIndex] : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Questions from CSV/XLSX</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {parsedRows.length === 0 ? (
            // File Upload Step
            <div className="space-y-6">
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
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={() => downloadTemplate('csv')}>
                    <Download className="mr-2 h-4 w-4" />
                    Download CSV Template
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => downloadTemplate('xlsx')}>
                    <Download className="mr-2 h-4 w-4" />
                    Download XLSX Template
                  </Button>
                </div>

                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                  <p className="font-medium">Required columns:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li><code>question</code> - The question text</li>
                    <li><code>option_a</code>, <code>option_b</code>, <code>option_c</code>, <code>option_d</code> - Answer options</li>
                    <li><code>correct_answer</code> - Must be exactly: A, B, C, or D</li>
                  </ul>
                  <p className="font-medium mt-4">Optional columns:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li><code>difficulty</code> - easy, intermediate, or hard (default: easy)</li>
                    <li><code>points</code> - Points value (default: 5)</li>
                    <li><code>time_limit</code> - Time limit in seconds (default: 30)</li>
                    <li><code>tags</code> - Comma-separated tags</li>
                  </ul>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-red-700 dark:text-red-400">{error}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Preview Step
            <div className="grid grid-cols-3 gap-4 h-full">
              {/* Left: Row List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Parsed Rows</h3>
                  <div className="text-xs text-gray-500">
                    {validRows.length} valid, {invalidRows.length} invalid
                  </div>
                </div>
                
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {parsedRows.map((row, index) => (
                    <div
                      key={index}
                      className={`p-3 border rounded cursor-pointer transition-colors ${
                        selectedRowIndex === index 
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                      onClick={() => setSelectedRowIndex(index)}
                    >
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={row.isSelected}
                          onCheckedChange={() => toggleRowSelection(index)}
                          disabled={!row.isValid}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            {row.isValid ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-red-500" />
                            )}
                            <span className="text-sm font-medium truncate">
                              Row {index + 1}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 truncate mt-1">
                            {row.question || "No question text"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Center: Question Preview */}
              <div className="space-y-4">
                <h3 className="font-medium">Question Preview</h3>
                {selectedRow ? (
                  <Card>
                    <CardContent className="p-4 space-y-4">
                      <div>
                        <Label className="text-sm font-medium">Question</Label>
                        <p className="text-sm mt-1">{selectedRow.question || "No question text"}</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { key: 'option_a', label: 'A' },
                          { key: 'option_b', label: 'B' },
                          { key: 'option_c', label: 'C' },
                          { key: 'option_d', label: 'D' }
                        ].map(({ key, label }) => (
                          <div
                            key={key}
                            className={`p-2 border rounded text-sm ${
                              selectedRow.correct_answer === label
                                ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800'
                                : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'
                            }`}
                          >
                            <span className="font-medium">{label}.</span> {selectedRow[key as keyof ImportRow] || `Option ${label}`}
                          </div>
                        ))}
                      </div>

                      {selectedRow.correct_answer && (
                        <div className="text-xs text-green-600 dark:text-green-400">
                          Correct Answer: {selectedRow.correct_answer}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 text-xs">
                        <Badge variant="outline">
                          {selectedRow.difficulty || 'easy'}
                        </Badge>
                        <Badge variant="outline">
                          {selectedRow.points || '5'} pts
                        </Badge>
                        <Badge variant="outline">
                          {selectedRow.time_limit || '30'}s
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    Select a row to preview the question
                  </div>
                )}
              </div>

              {/* Right: Validation Errors */}
              <div className="space-y-4">
                <h3 className="font-medium">Validation Results</h3>
                {selectedRow ? (
                  <div className="space-y-2">
                    {selectedRow.isValid ? (
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-green-700 dark:text-green-400">Valid question</span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                        <div className="flex items-center space-x-2 mb-2">
                          <AlertCircle className="h-4 w-4 text-red-500" />
                          <span className="text-sm font-medium text-red-700 dark:text-red-400">Validation Errors</span>
                        </div>
                        <ul className="space-y-1">
                          {selectedRow.errors.map((error, index) => (
                            <li key={index} className="text-xs text-red-600 dark:text-red-400">
                              • {error}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    Select a row to see validation results
                  </div>
                )}

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Valid rows:</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      {validRows.length}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Invalid rows:</span>
                    <Badge variant="secondary" className="bg-red-100 text-red-800">
                      {invalidRows.length}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Selected to import:</span>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      {selectedRows.length}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          
          {parsedRows.length > 0 && (
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setParsedRows([])
                  setSelectedRowIndex(null)
                  setError(null)
                }}
              >
                <X className="mr-2 h-4 w-4" />
                Clear
              </Button>
              <Button 
                onClick={handleImport}
                disabled={selectedRows.length === 0}
              >
                Import {selectedRows.length} Questions
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
