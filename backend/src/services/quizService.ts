import { PrismaClient, Quiz, Difficulty } from '@prisma/client';
import { redisService } from '../utils/redis';

const prisma = new PrismaClient();

export class QuizService {
  async createQuiz(
    title: string,
    description: string | undefined,
    categoryId: number,
    difficulty: Difficulty = 'MEDIUM',
    timeLimit?: number
  ): Promise<Quiz> {
    // Validate category exists
    const category = await prisma.category.findUnique({
      where: { id: categoryId }
    });
    if (!category) {
      throw new Error('Category not found');
    }

    const quiz = await prisma.quiz.create({
      data: {
        title,
        description,
        categoryId,
        difficulty,
        timeLimit
      },
      include: {
        category: true,
        _count: {
          select: {
            questions: true
          }
        }
      }
    });

    return quiz;
  }

  async getQuizById(id: number): Promise<any | null> {
    // Try to get from cache first
    const cached = await redisService.getCachedQuiz(id);
    if (cached) {
      return cached;
    }

    // Fetch from database with full details
    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        category: {
          include: {
            parent: {
              include: {
                parent: {
                  include: {
                    parent: true
                  }
                }
              }
            }
          }
        },
        questions: {
          include: {
            options: true
          },
          orderBy: {
            id: 'asc'
          }
        }
      }
    });

    if (quiz) {
      // Cache the result
      await redisService.cacheQuiz(id, quiz, 300); // Cache for 5 minutes
    }

    return quiz;
  }

  async getAllQuizzes(categoryId?: number): Promise<Quiz[]> {
    const where = categoryId ? { categoryId } : {};

    return await prisma.quiz.findMany({
      where,
      include: {
        category: true,
        _count: {
          select: {
            questions: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async updateQuiz(
    id: number,
    title?: string,
    description?: string,
    categoryId?: number,
    difficulty?: Difficulty,
    timeLimit?: number
  ): Promise<Quiz> {
    // Validate category exists if provided
    if (categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: categoryId }
      });
      if (!category) {
        throw new Error('Category not found');
      }
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (difficulty !== undefined) updateData.difficulty = difficulty;
    if (timeLimit !== undefined) updateData.timeLimit = timeLimit;

    const quiz = await prisma.quiz.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        _count: {
          select: {
            questions: true
          }
        }
      }
    });

    // Invalidate cache
    await redisService.invalidateQuizCache(id);

    return quiz;
  }

  async deleteQuiz(id: number): Promise<void> {
    await prisma.quiz.delete({
      where: { id }
    });

    // Invalidate cache
    await redisService.invalidateQuizCache(id);
  }

  async getQuizzesByCategory(categoryId: number): Promise<Quiz[]> {
    return await prisma.quiz.findMany({
      where: { categoryId },
      include: {
        category: true,
        _count: {
          select: {
            questions: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async getQuizStats(id: number): Promise<any> {
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

    if (!quiz) {
      throw new Error('Quiz not found');
    }

    const totalQuestions = quiz.questions.length;
    const totalOptions = quiz.questions.reduce((sum, q) => sum + q.options.length, 0);
    const correctOptions = quiz.questions.reduce(
      (sum, q) => sum + q.options.filter(o => o.isCorrect).length, 
      0
    );

    return {
      id: quiz.id,
      title: quiz.title,
      category: quiz.category.name,
      difficulty: quiz.difficulty,
      timeLimit: quiz.timeLimit,
      totalQuestions,
      totalOptions,
      correctOptions,
      createdAt: quiz.createdAt,
      updatedAt: quiz.updatedAt
    };
  }
}

export const quizService = new QuizService();
