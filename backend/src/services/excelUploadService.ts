import * as XLSX from 'xlsx';
import { QuestionBankItem, QuestionBankOption, Category, Difficulty } from '../models';
import { CategoryService } from './categoryService';
import { logInfo, logError } from '../utils/logger';
import { Op } from 'sequelize';

export interface ExcelQuestionRow {
  question: string;
  option1: string;
  option2: string;
  option3?: string;
  option4?: string;
  correctAnswers: string; // Comma-separated indices (e.g., "1,3" for option1 and option3)
  difficulty?: string;
  category?: string; // Optional category override
}

export interface UploadOptions {
  categoryId: number;
  includeSubcategories: boolean;
  subcategoryDepth?: number;
  createdById: number;
}

export interface UploadResult {
  totalRows: number;
  successfulImports: number;
  failedImports: number;
  errors: string[];
  importedQuestions: QuestionBankItem[];
  categoryDistribution: { [categoryName: string]: number };
}

export class ExcelUploadService {
  private categoryService: CategoryService;

  constructor() {
    this.categoryService = new CategoryService();
  }

  /**
   * Parse Excel file and import questions with hierarchical category support
   */
  async importQuestionsFromExcel(
    fileBuffer: Buffer,
    options: UploadOptions
  ): Promise<UploadResult> {
    try {
      logInfo('Starting Excel import', { 
        categoryId: options.categoryId, 
        includeSubcategories: options.includeSubcategories 
      });

      // Parse Excel file
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      // Parse headers and data
      const headers = rawData[0] as string[];
      const dataRows = rawData.slice(1) as any[][];
      
      // Validate headers
      this.validateHeaders(headers);
      
      // Convert to structured data
      const questions = this.parseQuestionRows(headers, dataRows);
      
      // Get target categories for import
      const targetCategories = await this.getTargetCategories(options);
      
      // Import questions
      const result = await this.importQuestions(questions, targetCategories, options);
      
      logInfo('Excel import completed', result);
      return result;

    } catch (error) {
      logError('Excel import failed', error as Error);
      throw error;
    }
  }

  /**
   * Validate Excel headers
   */
  private validateHeaders(headers: string[]): void {
    const requiredHeaders = ['question', 'option1', 'option2', 'correctAnswers'];
    const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
    
    for (const required of requiredHeaders) {
      if (!normalizedHeaders.includes(required.toLowerCase())) {
        throw new Error(`Missing required column: ${required}`);
      }
    }
  }

  /**
   * Parse Excel rows into structured question data
   */
  private parseQuestionRows(headers: string[], dataRows: any[][]): ExcelQuestionRow[] {
    const questions: ExcelQuestionRow[] = [];
    const headerMap = this.createHeaderMap(headers);
    
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      
      // Skip empty rows
      if (!row || row.every(cell => !cell)) continue;
      
      try {
        const question: ExcelQuestionRow = {
          question: this.getCellValue(row, headerMap, 'question'),
          option1: this.getCellValue(row, headerMap, 'option1'),
          option2: this.getCellValue(row, headerMap, 'option2'),
          option3: this.getCellValue(row, headerMap, 'option3'),
          option4: this.getCellValue(row, headerMap, 'option4'),
          correctAnswers: this.getCellValue(row, headerMap, 'correctAnswers') || this.getCellValue(row, headerMap, 'correct_answers') || '1',
          difficulty: this.getCellValue(row, headerMap, 'difficulty') || 'MEDIUM',
          category: this.getCellValue(row, headerMap, 'category')
        };
        
        // Validate question
        this.validateQuestion(question, i + 2); // +2 for header row and 0-based index
        
        questions.push(question);
      } catch (error) {
        logError(`Error parsing row ${i + 2}`, error as Error);
        throw new Error(`Row ${i + 2}: ${(error as Error).message}`);
      }
    }
    
    return questions;
  }

  /**
   * Create mapping of header names to column indices
   */
  private createHeaderMap(headers: string[]): { [key: string]: number } {
    const map: { [key: string]: number } = {};
    
    headers.forEach((header, index) => {
      const normalized = header.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      map[normalized] = index;
      
      // Common variations
      if (normalized.includes('correct')) {
        map['correctanswers'] = index;
        map['correct_answers'] = index;
      }
    });
    
    return map;
  }

  /**
   * Get cell value with fallback handling
   */
  private getCellValue(row: any[], headerMap: { [key: string]: number }, key: string): string {
    const variations = [
      key,
      key.toLowerCase(),
      key.replace(/[^a-z0-9]/gi, '').toLowerCase()
    ];
    
    for (const variation of variations) {
      const index = headerMap[variation];
      if (index !== undefined && row[index] !== undefined && row[index] !== null) {
        return String(row[index]).trim();
      }
    }
    
    return '';
  }

  /**
   * Validate individual question data
   */
  private validateQuestion(question: ExcelQuestionRow, rowNumber: number): void {
    if (!question.question) {
      throw new Error(`Question text is required`);
    }
    
    if (!question.option1 || !question.option2) {
      throw new Error(`At least 2 options are required`);
    }
    
    if (!question.correctAnswers) {
      throw new Error(`Correct answers must be specified`);
    }
    
    // Validate difficulty
    if (question.difficulty && !['EASY', 'MEDIUM', 'HARD'].includes(question.difficulty.toUpperCase())) {
      throw new Error(`Invalid difficulty: ${question.difficulty}. Must be EASY, MEDIUM, or HARD`);
    }
    
    // Validate correct answers format
    const correctIndices = question.correctAnswers.split(',').map(s => parseInt(s.trim()));
    const availableOptions = [question.option1, question.option2, question.option3, question.option4].filter(Boolean);
    
    for (const index of correctIndices) {
      if (isNaN(index) || index < 1 || index > availableOptions.length) {
        throw new Error(`Invalid correct answer index: ${index}. Must be between 1 and ${availableOptions.length}`);
      }
    }
  }

  /**
   * Get target categories based on upload options
   */
  private async getTargetCategories(options: UploadOptions): Promise<Category[]> {
    const categories: Category[] = [];
    
    // Get the main category
    const mainCategory = await Category.findByPk(options.categoryId);
    if (!mainCategory) {
      throw new Error(`Category with ID ${options.categoryId} not found`);
    }
    
    categories.push(mainCategory);
    
    // If including subcategories, get them
    if (options.includeSubcategories) {
      const subcategories = await this.categoryService.getSubcategories(
        options.categoryId,
        options.subcategoryDepth || 10
      );
      
      // Flatten subcategories
      const flattenedSubcategories = this.flattenCategories(subcategories);
      categories.push(...flattenedSubcategories);
    }
    
    return categories;
  }

  /**
   * Flatten nested category structure
   */
  private flattenCategories(categories: any[]): Category[] {
    const flattened: Category[] = [];
    
    for (const category of categories) {
      flattened.push(category);
      if (category.children && category.children.length > 0) {
        flattened.push(...this.flattenCategories(category.children));
      }
    }
    
    return flattened;
  }

  /**
   * Import questions to database
   */
  private async importQuestions(
    questions: ExcelQuestionRow[],
    targetCategories: Category[],
    options: UploadOptions
  ): Promise<UploadResult> {
    const result: UploadResult = {
      totalRows: questions.length,
      successfulImports: 0,
      failedImports: 0,
      errors: [],
      importedQuestions: [],
      categoryDistribution: {}
    };

    for (let i = 0; i < questions.length; i++) {
      const questionData = questions[i];
      
      try {
        // Determine target category
        let targetCategory = targetCategories[0]; // Default to main category
        
        // If question specifies a category, try to find it
        if (questionData.category) {
          const specifiedCategory = targetCategories.find(cat => 
            cat.name.toLowerCase().includes(questionData.category!.toLowerCase()) ||
            questionData.category!.toLowerCase().includes(cat.name.toLowerCase())
          );
          
          if (specifiedCategory) {
            targetCategory = specifiedCategory;
          }
        } else if (targetCategories.length > 1) {
          // Distribute questions evenly across categories if no specific category
          targetCategory = targetCategories[i % targetCategories.length];
        }

        // Create question
        const question = await QuestionBankItem.create({
          questionText: questionData.question,
          difficulty: (questionData.difficulty?.toUpperCase() as Difficulty) || Difficulty.MEDIUM,
          categoryId: targetCategory.id,
          createdById: options.createdById,
          isActive: true
        });

        // Create options
        const options_data = [
          { text: questionData.option1, isCorrect: false },
          { text: questionData.option2, isCorrect: false },
          questionData.option3 ? { text: questionData.option3, isCorrect: false } : null,
          questionData.option4 ? { text: questionData.option4, isCorrect: false } : null
        ].filter(Boolean) as { text: string; isCorrect: boolean }[];

        // Set correct answers
        const correctIndices = questionData.correctAnswers.split(',').map(s => parseInt(s.trim()) - 1);
        correctIndices.forEach(index => {
          if (options_data[index]) {
            options_data[index].isCorrect = true;
          }
        });

        // Create options in database
        for (const optionData of options_data) {
          await QuestionBankOption.create({
            questionId: question.id,
            optionText: optionData.text,
            isCorrect: optionData.isCorrect
          });
        }

        result.importedQuestions.push(question);
        result.successfulImports++;
        
        // Track category distribution
        const categoryName = targetCategory.name;
        result.categoryDistribution[categoryName] = (result.categoryDistribution[categoryName] || 0) + 1;

      } catch (error) {
        result.failedImports++;
        const errorMessage = `Row ${i + 2}: ${(error as Error).message}`;
        result.errors.push(errorMessage);
        logError(`Failed to import question from row ${i + 2}`, error as Error);
      }
    }

    return result;
  }

  /**
   * Generate Excel template for question import
   */
  generateTemplate(): Buffer {
    const templateData = [
      ['question', 'option1', 'option2', 'option3', 'option4', 'correctAnswers', 'difficulty', 'category'],
      [
        'What is the capital of France?',
        'London',
        'Paris',
        'Berlin',
        'Madrid',
        '2',
        'EASY',
        'Geography'
      ],
      [
        'Which of the following are programming languages?',
        'JavaScript',
        'HTML',
        'Python',
        'CSS',
        '1,3',
        'MEDIUM',
        'Computer Science'
      ],
      [
        'What is 2 + 2?',
        '3',
        '4',
        '5',
        '6',
        '2',
        'EASY',
        'Mathematics'
      ]
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Questions');

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }
}

export const excelUploadService = new ExcelUploadService();
