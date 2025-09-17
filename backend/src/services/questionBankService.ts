import { PrismaClient } from '@prisma/client';
import { logInfo, logError } from '../utils/logger';

enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD'
}
import * as XLSX from 'xlsx';

const prisma = new PrismaClient();

export interface CreateQuestionBankItemData {
  questionText: string;
  categoryId: number;
  difficulty: Difficulty;
  createdById: number;
  options: {
    optionText: string;
    isCorrect: boolean;
  }[];
}

export interface BulkImportData {
  categoryId: number;
  createdById: number;
  questions: {
    questionText: string;
    difficulty: Difficulty;
    options: {
      optionText: string;
      isCorrect: boolean;
    }[];
  }[];
}

export class QuestionBankService {
  async createQuestion(data: CreateQuestionBankItemData) {
    try {
      const question = await prisma.questionBankItem.create({
        data: {
          questionText: data.questionText,
          categoryId: data.categoryId,
          difficulty: data.difficulty,
          createdById: data.createdById,
          options: {
            create: data.options
          }
        },
        include: {
          options: true,
          category: true,
          createdBy: {
            select: {
              id: true,
              username: true
            }
          }
        }
      });

      logInfo('Question bank item created', { questionId: question.id });
      return question;
    } catch (error) {
      logError('Error creating question bank item', error as Error);
      throw error;
    }
  }

  async getQuestionsByCategory(categoryId: number, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      
      const [questions, total] = await Promise.all([
        prisma.questionBankItem.findMany({
          where: {
            categoryId,
            isActive: true
          },
          include: {
            options: true,
            category: true,
            createdBy: {
              select: {
                id: true,
                username: true
              }
            }
          },
          skip,
          take: limit,
          orderBy: {
            createdAt: 'desc'
          }
        }),
        prisma.questionBankItem.count({
          where: {
            categoryId,
            isActive: true
          }
        })
      ]);

      return {
        questions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logError('Error fetching questions by category', error as Error);
      throw error;
    }
  }

  async getAllQuestions(page = 1, limit = 20, difficulty?: Difficulty) {
    try {
      const skip = (page - 1) * limit;
      const where: any = { isActive: true };
      
      if (difficulty) {
        where.difficulty = difficulty;
      }

      const [questions, total] = await Promise.all([
        prisma.questionBankItem.findMany({
          where,
          include: {
            options: true,
            category: true,
            createdBy: {
              select: {
                id: true,
                username: true
              }
            }
          },
          skip,
          take: limit,
          orderBy: {
            createdAt: 'desc'
          }
        }),
        prisma.questionBankItem.count({ where })
      ]);

      return {
        questions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logError('Error fetching all questions', error as Error);
      throw error;
    }
  }

  async getQuestionById(id: number) {
    try {
      const question = await prisma.questionBankItem.findUnique({
        where: { id },
        include: {
          options: true,
          category: true,
          createdBy: {
            select: {
              id: true,
              username: true
            }
          }
        }
      });

      return question;
    } catch (error) {
      logError('Error fetching question by ID', error as Error);
      throw error;
    }
  }

  async updateQuestion(id: number, data: Partial<CreateQuestionBankItemData>) {
    try {
      const updateData: any = {
        questionText: data.questionText,
        categoryId: data.categoryId,
        difficulty: data.difficulty
      };

      // If options are provided, update them
      if (data.options) {
        // Delete existing options and create new ones
        await prisma.questionBankOption.deleteMany({
          where: { questionId: id }
        });

        updateData.options = {
          create: data.options
        };
      }

      const question = await prisma.questionBankItem.update({
        where: { id },
        data: updateData,
        include: {
          options: true,
          category: true,
          createdBy: {
            select: {
              id: true,
              username: true
            }
          }
        }
      });

      logInfo('Question bank item updated', { questionId: id });
      return question;
    } catch (error) {
      logError('Error updating question bank item', error as Error);
      throw error;
    }
  }

  async deleteQuestion(id: number) {
    try {
      await prisma.questionBankItem.update({
        where: { id },
        data: { isActive: false }
      });

      logInfo('Question bank item deleted (soft delete)', { questionId: id });
      return true;
    } catch (error) {
      logError('Error deleting question bank item', error as Error);
      throw error;
    }
  }

  async bulkImport(data: BulkImportData) {
    try {
      const results = [];

      for (const questionData of data.questions) {
        const question = await this.createQuestion({
          ...questionData,
          categoryId: data.categoryId,
          createdById: data.createdById
        });
        results.push(question);
      }

      logInfo('Bulk import completed', { 
        categoryId: data.categoryId, 
        questionsImported: results.length 
      });

      return {
        imported: results.length,
        questions: results
      };
    } catch (error) {
      logError('Error in bulk import', error as Error);
      throw error;
    }
  }

  async parseExcelFile(buffer: Buffer): Promise<any[]> {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      // Parse the Excel data into our question format
      const questions = [];
      
      for (const row of jsonData as any[]) {
        // Expected Excel format:
        // Question | Option1 | Option2 | Option3 | Option4 | CorrectAnswer | Difficulty
        const question: {
          questionText: string;
          difficulty: string;
          options: Array<{ optionText: string; isCorrect: boolean }>;
        } = {
          questionText: row['Question'] || row['question'],
          difficulty: (row['Difficulty'] || row['difficulty'] || 'MEDIUM').toUpperCase(),
          options: []
        };

        // Add options
        const options = [
          { text: row['Option1'] || row['option1'], isCorrect: false },
          { text: row['Option2'] || row['option2'], isCorrect: false },
          { text: row['Option3'] || row['option3'], isCorrect: false },
          { text: row['Option4'] || row['option4'], isCorrect: false }
        ].filter(opt => opt.text); // Remove empty options

        // Mark correct answer
        const correctAnswer = row['CorrectAnswer'] || row['correctAnswer'] || row['correct_answer'];
        if (correctAnswer) {
          const correctIndex = parseInt(correctAnswer) - 1; // Assuming 1-based indexing
          if (correctIndex >= 0 && correctIndex < options.length) {
            options[correctIndex].isCorrect = true;
          }
        }

        question.options = options.map(opt => ({
          optionText: opt.text,
          isCorrect: opt.isCorrect
        }));

        // Validate question has at least one correct answer
        if (question.options.some(opt => opt.isCorrect)) {
          questions.push(question);
        }
      }

      return questions;
    } catch (error) {
      logError('Error parsing Excel file', error as Error);
      throw new Error('Invalid Excel file format');
    }
  }

  async searchQuestions(query: string, categoryId?: number, difficulty?: Difficulty) {
    try {
      const where: any = {
        isActive: true,
        questionText: {
          contains: query,
          mode: 'insensitive'
        }
      };

      if (categoryId) {
        where.categoryId = categoryId;
      }

      if (difficulty) {
        where.difficulty = difficulty;
      }

      const questions = await prisma.questionBankItem.findMany({
        where,
        include: {
          options: true,
          category: true,
          createdBy: {
            select: {
              id: true,
              username: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return questions;
    } catch (error) {
      logError('Error searching questions', error as Error);
      throw error;
    }
  }
}
