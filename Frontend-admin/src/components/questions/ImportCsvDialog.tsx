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
  DialogDescription,
} from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Upload, Download, AlertCircle, CheckCircle, X } from "lucide-react"
import Papa from "papaparse"
import * as XLSX from "xlsx"
import type { Question, ImportRow, ImportValidationError } from "@/types/question"

interface ImportCsvDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (questions: Question[]) => void
}

interface ParsedRow extends ImportRow {
  rowIndex: number
  isValid: boolean
  errors: string[]
  isSelected: boolean
}

export function ImportCsvDialog({ open, onOpenChange, onImport }: ImportCsvDialogProps) {
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const normalizeKey = (value: string): string =>
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '')

  const getCellValue = (row: Record<string, any>, keys: string[]): string => {
    if (!row) return ""
    const normalizedRow: Record<string, any> = {}
    for (const [key, val] of Object.entries(row)) {
      normalizedRow[normalizeKey(key)] = val
    }
    for (const key of keys) {
      const val = normalizedRow[normalizeKey(key)]
      if (val !== undefined && val !== null && String(val).trim() !== "") {
        return String(val).trim()
      }
    }
    return ""
  }

  const normalizeCorrectAnswerToken = (token: string): string => {
    const normalized = token.trim().toLowerCase().replace(/\s+/g, "")
    const cleaned = normalized.replace(/[^a-z0-9_]/g, "")
    const optionLetterMatch = cleaned.match(/^option_?([abcd])$/)
    if (optionLetterMatch?.[1]) return `option_${optionLetterMatch[1]}`
    const optionNumberMatch = cleaned.match(/^option_?([1-4])$/)
    if (optionNumberMatch?.[1]) {
      return `option_${String.fromCharCode(96 + parseInt(optionNumberMatch[1], 10))}`
    }
    if (/^[abcd]$/.test(cleaned)) return `option_${cleaned}`
    if (/^[1-4]$/.test(cleaned)) {
      return `option_${String.fromCharCode(96 + parseInt(cleaned, 10))}`
    }
    return ""
  }

  const normalizeCorrectAnswer = (answer: string): string => {
    if (!answer) return ""
    const tokens = String(answer)
      .trim()
      .split(/[,\s]+/)
      .map(t => t.trim())
      .filter(Boolean)

    if (tokens.length === 1) {
      const single = tokens[0]
      const chars = single.replace(/[^a-z0-9]/gi, "")
      if (/^[abcd]+$/i.test(chars) || /^[1234]+$/.test(chars)) {
        return chars
          .split("")
          .map(ch => normalizeCorrectAnswerToken(ch))
          .filter(Boolean)
          .join(",")
      }
    }

    return tokens
      .map(t => normalizeCorrectAnswerToken(t))
      .filter(Boolean)
      .join(",")
  }

  const downloadTemplate = (format: 'csv' | 'xlsx') => {
    const templateData = [
      {
        question: "What is the capital of France?",
        option_a: "Paris",
        option_b: "London", 
        option_c: "Berlin",
        option_d: "Madrid",
        correct_answer: "option_a"
      },
      {
        question: "Which language runs on web?",
        option_a: "Java",
        option_b: "C++",
        option_c: "Python", 
        option_d: "JavaScript",
        correct_answer: "option_d"
      }
    ]

    if (format === 'csv') {
      const csv = Papa.unparse(templateData)
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'quiz_template.csv'
      a.click()
      URL.revokeObjectURL(url)
    } else {
      const ws = XLSX.utils.json_to_sheet(templateData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Questions")
      XLSX.writeFile(wb, "quiz_template.xlsx")
    }
  }

  const validateRow = (row: ImportRow, index: number): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []

    if (!row.question?.trim()) {
      errors.push("Question text is required")
    }

    if (!row.option_a?.trim()) errors.push("Option A is required")
    if (!row.option_b?.trim()) errors.push("Option B is required")
    if (!row.option_c?.trim()) errors.push("Option C is required")
    if (!row.option_d?.trim()) errors.push("Option D is required")

    const normalizedCorrect = normalizeCorrectAnswer(row.correct_answer)
    const normalizedTokens = normalizedCorrect
      .split(",")
      .map(t => t.trim())
      .filter(Boolean)

    if (normalizedTokens.length !== 1) {
      errors.push(
        "Correct answer must specify exactly one answer (A/B/C/D, 1/2/3/4, option_a/option_1, etc.)",
      )
    } else {
      const validAnswers = ["option_a", "option_b", "option_c", "option_d"]
      if (!validAnswers.includes(normalizedTokens[0])) {
        errors.push(
          "Correct answer must be one of: option_a, option_b, option_c, option_d (or A/B/C/D or 1/2/3/4)",
        )
      }
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

      // Validate headers (support multiple formats)
      const headers = Object.keys(data[0] || {}).map(h => normalizeKey(h))
      const hasQuestion = headers.includes("question")
        || headers.includes("questiontext")
        || headers.includes("question_text")

      const hasOptionA = headers.includes("optiona")
        || headers.includes("option_a")
        || headers.includes("option1")
        || headers.includes("option_1")
        || headers.includes("a")
        || headers.includes("1")

      const hasOptionB = headers.includes("optionb")
        || headers.includes("option_b")
        || headers.includes("option2")
        || headers.includes("option_2")
        || headers.includes("b")
        || headers.includes("2")

      const hasOptionC = headers.includes("optionc")
        || headers.includes("option_c")
        || headers.includes("option3")
        || headers.includes("option_3")
        || headers.includes("c")
        || headers.includes("3")

      const hasOptionD = headers.includes("optiond")
        || headers.includes("option_d")
        || headers.includes("option4")
        || headers.includes("option_4")
        || headers.includes("d")
        || headers.includes("4")

      const hasCorrect = headers.includes("correctanswer")
        || headers.includes("correct_answer")
        || headers.includes("correctanswers")
        || headers.includes("correct_answers")
        || headers.includes("correct")
        || headers.includes("answer")

      if (!hasQuestion || !hasOptionA || !hasOptionB || !hasOptionC || !hasOptionD || !hasCorrect) {
        throw new Error(
          "Missing required columns. Provide: question, 4 options (A-D / 1-4 / option_a..d / option_1..4), and correct_answer (or correct/answer)",
        )
      }

      // Normalize and validate rows
      const normalizedRows: ParsedRow[] = data.map((row: any, index: number) => {
        const normalizedRow: ImportRow = {
          question: getCellValue(row, ["question", "Question", "questionText", "QuestionText", "question_text"]),
          option_a: getCellValue(row, ["option_a", "Option_A", "optionA", "OptionA", "option1", "option_1", "A", "1"]),
          option_b: getCellValue(row, ["option_b", "Option_B", "optionB", "OptionB", "option2", "option_2", "B", "2"]),
          option_c: getCellValue(row, ["option_c", "Option_C", "optionC", "OptionC", "option3", "option_3", "C", "3"]),
          option_d: getCellValue(row, ["option_d", "Option_D", "optionD", "OptionD", "option4", "option_4", "D", "4"]),
          correct_answer: getCellValue(row, [
            "correct_answer",
            "Correct_Answer",
            "correctAnswer",
            "CorrectAnswer",
            "correct",
            "Correct",
            "answer",
            "Answer",
          ]),
        }

        normalizedRow.correct_answer = normalizeCorrectAnswer(normalizedRow.correct_answer)

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
    
    const questions: Question[] = selectedValidRows.map(row => {
      const options = [
        { id: `${Date.now()}_${Math.random()}_a`, text: row.option_a },
        { id: `${Date.now()}_${Math.random()}_b`, text: row.option_b },
        { id: `${Date.now()}_${Math.random()}_c`, text: row.option_c },
        { id: `${Date.now()}_${Math.random()}_d`, text: row.option_d }
      ]

      const correctKey = String(row.correct_answer || "").split(",")[0]
      const correctIndex = ['option_a', 'option_b', 'option_c', 'option_d'].indexOf(correctKey)
      
      return {
        id: `${Date.now()}_${Math.random()}`,
        text: row.question,
        options,
        correctOptionId: options[correctIndex].id,
        type: 'multiple-choice' as const,
        difficulty: 'easy' as const,
        tags: [],
        points: 10,
        timeLimit: 30,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    onImport(questions)
    
    // Show success message
    const importedCount = questions.length
    const skippedCount = parsedRows.length - importedCount
    console.log(`Imported ${importedCount} questions, ${skippedCount} skipped`)
    
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
          <DialogDescription>
            Upload a CSV or Excel file containing questions to import them into your quiz.
          </DialogDescription>
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
                    <li><code>option_a</code>..<code>option_d</code> (or <code>option_1</code>..<code>option_4</code>, or <code>A</code>..<code>D</code>, or <code>1</code>..<code>4</code>) - Answer options</li>
                    <li><code>correct_answer</code> (or <code>correct</code>/<code>answer</code>) - Accepts: option_a..d, option_1..4, A-D, 1-4, abcd/ABCD, 1234</li>
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
                              selectedRow.correct_answer === key
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
                          Correct Answer: {selectedRow.correct_answer.replace('option_', '').toUpperCase()}
                        </div>
                      )}
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
