import { PrismaClient } from '@prisma/client';
import { logInfo, logError } from '../utils/logger';

enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD'
}

const prisma = new PrismaClient();

export interface CreateQuizData {
  title: string;
  description?: string;
  difficulty?: Difficulty;
  timeLimit?: number;
  maxQuestions?: number;
  categoryId: number;
  createdById: number;
}

export interface AssignQuestionsData {
  quizId: number;
  questionIds: number[];
}

export interface QuizSearchFilters {
  difficulty?: Difficulty;
  categoryId?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export class QuizService {
  async createQuiz(quizData: CreateQuizData) {
    try {
      // Verify category exists
      const category = await prisma.category.findUnique({
        where: { id: quizData.categoryId }
      });

      if (!category) {
        throw new Error(`Category with ID ${quizData.categoryId} not found`);
      }

      const quiz = await prisma.quiz.create({

        data: {
          title: quizData.title,
          description: quizData.description,
          difficulty: quizData.difficulty || 'MEDIUM',
          timeLimit: quizData.timeLimit,
          maxQuestions: quizData.maxQuestions,
          categoryId: quizData.categoryId,
          createdById: quizData.createdById
        },
        include: {
          category: true,
          createdBy: {
            select: {
              id: true,
              username: true
            }
          },
          quizQuestions: {
            include: {
              question: {
                include: {




                  
                  options: true
                }
              }
            }
          },
          _count: {
            select: {
              quizQuestions: true,
              attempts: true
            }
          }
        }
      });

      logInfo('Quiz created', { quizId: quiz.id, title: quiz.title });
      return quiz;
    } catch (error) {
      logError('Failed to create quiz', error as Error, { title: quizData.title });
      throw error;
    }
  }

  async assignQuestionsToQuiz(data: AssignQuestionsData) {
    try {
      // Verify quiz exists
      const quiz = await prisma.quiz.findUnique({
        where: { id: data.quizId }
      });

      if (!quiz) {
        throw new Error('Quiz not found');
      }

      // Verify all questions exist
      const questions = await prisma.questionBankItem.findMany({
        where: {
          id: { in: data.questionIds },
          isActive: true
        }
      });

      if (questions.length !== data.questionIds.length) {
        throw new Error('Some questions not found or inactive');
      }

      // Remove existing question assignments
      await prisma.quizQuestion.deleteMany({
        where: { quizId: data.quizId }
      });

      // Create new assignments
      const assignments = await prisma.quizQuestion.createMany({
        data: data.questionIds.map((questionId, index) => ({
          quizId: data.quizId,
          questionId,
          order: index + 1
        }))
      });

      logInfo('Questions assigned to quiz', { 
        quizId: data.quizId, 
        questionsAssigned: assignments.count 
      });

      return assignments;
    } catch (error) {
      logError('Failed to assign questions to quiz', error as Error);
      throw error;
    }
  }

  async searchQuizzes(filters: QuizSearchFilters) {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const skip = (page - 1) * limit;

      const where: any = { isActive: true };

      if (filters.difficulty) {
        where.difficulty = filters.difficulty;
      }

      if (filters.categoryId) {
        where.categoryId = filters.categoryId;
      }

      if (filters.search) {
        where.OR = [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } }
        ];
      }

      const [quizzes, total] = await Promise.all([
        prisma.quiz.findMany({
          where,
          include: {
            category: true,
            createdBy: {
              select: {
                id: true,
                username: true
              }
            },
            _count: {
              select: {
                quizQuestions: true,
                attempts: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          skip,
          take: limit
        }),
        prisma.quiz.count({ where })
      ]);

      return {
        quizzes,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logError('Failed to search quizzes', error as Error);
      throw error;
    }
  }

  async getQuizById(id: number) {
    try {
      const quiz = await prisma.quiz.findUnique({
        where: { id, isActive: true },
        include: {
          category: true,
          createdBy: {
            select: {
              id: true,
              username: true
            }
          },
          quizQuestions: {
            include: {
              question: {
                include: {
                  options: true
                }
              }
            },
            orderBy: {
              order: 'asc'
            }
          },
          _count: {
            select: {
              quizQuestions: true,
              attempts: true
            }
          }
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

  async getQuizForPlay(id: number, userId: number) {
    try {
      const quiz = await prisma.quiz.findUnique({
        where: { id, isActive: true },
        include: {
          category: true,
          quizQuestions: {
            include: {
              question: {
                include: {
                  options: {
                    select: {
                      id: true,
                      optionText: true
                      // Don't include isCorrect for players
                    }
                  }
                }
              }
            },
            orderBy: {
              order: 'asc'
            }
          }
        }
      });

      if (!quiz) {
        return null;
      }

      // Shuffle questions if maxQuestions is set
      let questions = quiz.quizQuestions;
      if (quiz.maxQuestions && questions.length > quiz.maxQuestions) {
        questions = questions
          .sort(() => Math.random() - 0.5)
          .slice(0, quiz.maxQuestions);
      }

      return {
        ...quiz,
        quizQuestions: questions
      };
    } catch (error) {
      logError('Failed to get quiz for play', error as Error, { quizId: id, userId });
      throw error;
    }
  }

  async updateQuiz(id: number, data: Partial<CreateQuizData>) {
    try {
      // Check if quiz exists
      const existingQuiz = await prisma.quiz.findUnique({
        where: { id }
      });

      if (!existingQuiz) {
        throw new Error('Quiz not found');
      }

      const updatedQuiz = await prisma.quiz.update({
        where: { id },
        data: {
          title: data.title,
          description: data.description,
          difficulty: data.difficulty,
          timeLimit: data.timeLimit,
          maxQuestions: data.maxQuestions,
          categoryId: data.categoryId
        },
        include: {
          category: true,
          createdBy: {
            select: {
              id: true,
              username: true
            }
          },
          quizQuestions: {
            include: {
              question: {
                include: {
                  options: true
                }
              }
            }
          },
          _count: {
            select: {
              quizQuestions: true,
              attempts: true
            }
          }
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
      await prisma.quiz.update({
        where: { id },
        data: { isActive: false }
      });
      
      logInfo('Quiz deleted (soft delete)', { quizId: id });
      return true;
    } catch (error) {
      logError('Failed to delete quiz', error as Error, { quizId: id });
      return false;
    }
  }

  async getQuizStats(id: number) {
    try {
      const quiz = await prisma.quiz.findUnique({
        where: { id },
        include: {
          quizQuestions: {
            include: {
              question: {
                include: {
                  options: true
                }
              }
            }
          },
          attempts: {
            select: {
              id: true,
              score: true,
              status: true,
              user: {
                select: {
                  username: true
                }
              }
            }
          },
          _count: {
            select: {
              quizQuestions: true,
              attempts: true
            }
          }
        }
      });

      if (!quiz) {
        return null;
      }

      const completedAttempts = quiz.attempts.filter((a: any) => a.status === 'COMPLETED');
      const averageScore = completedAttempts.length > 0 
        ? completedAttempts.reduce((sum: number, a: any) => sum + a.score, 0) / completedAttempts.length 
        : 0;

      const stats = {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        difficulty: quiz.difficulty,
        timeLimit: quiz.timeLimit,
        maxQuestions: quiz.maxQuestions,
        categoryId: quiz.categoryId,
        totalQuestions: quiz._count.quizQuestions,
        totalAttempts: quiz._count.attempts,
        completedAttempts: completedAttempts.length,
        averageScore: Math.round(averageScore * 100) / 100,
        createdAt: quiz.createdAt,
        updatedAt: quiz.updatedAt
      };

      logInfo('Quiz stats retrieved', { quizId: id, totalQuestions: stats.totalQuestions });
      return stats;
    } catch (error) {
      logError('Failed to retrieve quiz stats', error as Error, { quizId: id });
      throw error;
    }
  }

  async getPopularQuizzes(limit = 10) {
    try {
      const quizzes = await prisma.quiz.findMany({
        where: { isActive: true },
        include: {
          category: true,
          createdBy: {
            select: {
              id: true,
              username: true
            }
          },
          _count: {
            select: {
              attempts: true,
              quizQuestions: true
            }
          }
        },
        orderBy: {
          attempts: {
            _count: 'desc'
          }
        },
        take: limit
      });

      return quizzes;
    } catch (error) {
      logError('Failed to get popular quizzes', error as Error);
      throw error;
    }
  }
}

export const quizService = new QuizService();
