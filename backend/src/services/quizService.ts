import { prisma } from '../server';
import { logInfo, logError } from '../utils/logger';
import { Prisma as PrismaTypes, Quiz as PrismaQuiz, Question as PrismaQuestion, Option as PrismaOption, Category } from '@prisma/client';

// Type definitions from Prisma
type Quiz = PrismaTypes.QuizGetPayload<{
  include: {
    questions: {
      include: {
        options: true;
      };
    };
  };
}>;

type Question = PrismaTypes.QuestionGetPayload<{
  include: {
    options: true;
  };
}>;

type Option = PrismaTypes.OptionGetPayload<{}>;

// Extend base types with relationships
type QuestionWithOptions = PrismaQuestion & {
  options: PrismaOption[];
};

type QuizWithRelations = Omit<PrismaQuiz, 'questions'> & {
  questions?: QuestionWithOptions[];
  category?: Category;
};

export interface CreateQuizData {
  title: string;
  description?: string;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  timeLimit?: number | null;
  questions?: Array<{
    questionText: string;
    options: Array<{
      optionText: string;
      isCorrect: boolean;
    }>;
  }>;
  categoryId?: number; // For internal use
}

export class QuizService {
  async createQuiz(quizData: CreateQuizData): Promise<QuizWithRelations> {
    try {
      // CategoryId is required, use default category if not provided
      const finalCategoryId = quizData.categoryId || 1;
      
      // Verify category exists
      const category = await prisma.category.findUnique({
        where: { id: finalCategoryId }
      });

      if (!category) {
        throw new Error(`Category with ID ${finalCategoryId} not found`);
      }

      const quizDataWithRelations: any = {
        title: quizData.title,
        description: quizData.description,
        difficulty: quizData.difficulty || 'MEDIUM',
        timeLimit: quizData.timeLimit,
        categoryId: finalCategoryId
      };

      if (quizData.questions) {
        quizDataWithRelations.questions = {
          create: quizData.questions.map(q => ({
            questionText: q.questionText,
            options: {
              create: q.options.map(opt => ({
                optionText: opt.optionText,
                isCorrect: opt.isCorrect
              }))
            }
          }))
        };
      }

      const quiz = await prisma.quiz.create({
        data: quizDataWithRelations,
        include: {
          questions: {
            include: {
              options: true
            }
          },
          category: true
        }
      });

      logInfo('Quiz created', { quizId: quiz.id });
      return quiz;
    } catch (error) {
      logError('Failed to create quiz', error as Error, { title: quizData.title });
      throw error;
    }
  }

  async getAllQuizzes(filters?: {
    difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
    categoryId?: number;
    limit?: number;
    offset?: number;
  }): Promise<{ quizzes: Quiz[]; total: number }> {
    try {
      const where: any = {};
      
      if (filters?.difficulty) {
        where.difficulty = filters.difficulty;
      }
      
      if (filters?.categoryId) {
        where.categoryId = filters.categoryId;
      }

      const [quizzes, total] = await Promise.all([
        prisma.quiz.findMany({
          where,
          include: {
            questions: {
              include: {
                options: true
              }
            },
            category: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: filters?.limit || 50,
          skip: filters?.offset || 0
        }),
        prisma.quiz.count({ where })
      ]);

      logInfo('Retrieved quizzes', { count: quizzes.length, total });
      return { quizzes, total };
    } catch (error) {
      logError('Failed to retrieve quizzes', error as Error);
      throw error;
    }
  }

  async getQuizById(id: number): Promise<QuizWithRelations | null> {
    try {
      const quiz = await prisma.quiz.findUnique({
        where: { id },
        include: {
          questions: {
            include: {
              options: true
            }
          },
          category: true
        }
      });

      if (quiz) {
        logInfo('Retrieved quiz by ID', { quizId: id });
      } else {
        logInfo('Quiz not found', { quizId: id });
      }

      return quiz;
    } catch (error) {
      logError('Failed to retrieve quiz', error as Error, { quizId: id });
      throw error;
    }
  }

  async updateQuiz(id: number, data: Partial<CreateQuizData>): Promise<QuizWithRelations> {
    try {
      // Check if quiz exists
      const existingQuiz = await prisma.quiz.findUnique({
        where: { id }
      });

      if (!existingQuiz) {
        throw new Error('Quiz not found');
      }

      // Prepare update data
      const updateData: any = {
        title: data.title,
        description: data.description,
        difficulty: data.difficulty,
        timeLimit: data.timeLimit
      };

      // Remove undefined values
      Object.keys(updateData).forEach(key => 
        updateData[key] === undefined && delete updateData[key]
      );

      const updatedQuiz = await prisma.quiz.update({
        where: { id },
        data: updateData,
        include: {
          questions: {
            include: {
              options: true
            }
          },
          category: true
        }
      });

      logInfo('Quiz updated', { quizId: id });
      return updatedQuiz;
    } catch (error) {
      logError('Failed to update quiz', error as Error, { quizId: id });
      throw error;
    }
  }

  async deleteQuiz(id: number): Promise<boolean> {
    try {
      await prisma.quiz.delete({
        where: { id }
      });
      
      logInfo('Quiz deleted successfully', { quizId: id });
      return true;
    } catch (error) {
      logError('Failed to delete quiz', error as Error, { quizId: id });
      return false;
    }
  }

  async updateQuestionCount(quizId: number): Promise<number> {
    try {
      const questionCount = await prisma.question.count({
        where: { quizId }
      });

      logInfo('Quiz question count retrieved', { quizId, questionCount });
      return questionCount;
    } catch (error) {
      logError('Failed to get question count', error as Error, { quizId });
      throw error;
    }
  }

  async getQuizStats(id: number): Promise<any> {
    try {
      const quiz = await prisma.quiz.findUnique({
        where: { id },
        include: {
          questions: {
            include: {
              options: true
            }
          }
        }
      });

      if (!quiz) {
        return null;
      }

      const totalQuestions = quiz.questions.length;
      const totalOptions = quiz.questions.reduce((sum:number, q:Question) => sum + q.options.length, 0);
      const correctOptions = quiz.questions.reduce(
        (sum:number, q:Question) => sum + q.options.filter((o:Option) => o.isCorrect).length, 
        0
      );

      const stats = {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        difficulty: quiz.difficulty,
        timeLimit: quiz.timeLimit,
        categoryId: quiz.categoryId,
        totalQuestions,
        totalOptions,
        correctOptions,
        createdAt: quiz.createdAt,
        updatedAt: quiz.updatedAt
      };

      logInfo('Quiz stats retrieved', { quizId: id, totalQuestions });
      return stats;
    } catch (error) {
      logError('Failed to retrieve quiz stats', error as Error, { quizId: id });
      throw error;
    }
  }
}

export const quizService = new QuizService();
