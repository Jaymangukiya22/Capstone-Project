import { PrismaClient, Question } from '@prisma/client';
import { redisService } from '../utils/redis';

const prisma = new PrismaClient();

export interface CreateQuestionData {
  quizId: number;
  questionText: string;
  options: {
    optionText: string;
    isCorrect: boolean;
  }[];
}

export class QuestionService {
  async createQuestion(data: CreateQuestionData): Promise<Question> {
    // Validate quiz exists
    const quiz = await prisma.quiz.findUnique({
      where: { id: data.quizId }
    });
    if (!quiz) {
      throw new Error('Quiz not found');
    }

    // Validate at least one correct answer
    const hasCorrectAnswer = data.options.some(option => option.isCorrect);
    if (!hasCorrectAnswer) {
      throw new Error('At least one option must be marked as correct');
    }

    // Validate options count (2-4 options)
    if (data.options.length < 2 || data.options.length > 4) {
      throw new Error('Question must have between 2 and 4 options');
    }

    const question = await prisma.question.create({
      data: {
        quizId: data.quizId,
        questionText: data.questionText,
        options: {
          create: data.options
        }
      },
      include: {
        options: true,
        quiz: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    // Invalidate quiz cache since it now has new questions
    await redisService.invalidateQuizCache(data.quizId);

    return question;
  }

  async addQuestionToQuiz(quizId: number, questionText: string, options: { optionText: string; isCorrect: boolean }[]): Promise<Question> {
    return this.createQuestion({
      quizId,
      questionText,
      options
    });
  }

  async getQuestionsByQuizId(quizId: number): Promise<Question[]> {
    // Verify quiz exists
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId }
    });
    
    if (!quiz) {
      const error = new Error('Quiz not found');
      (error as any).statusCode = 400;
      throw error;
    }

    return await prisma.question.findMany({
      where: { quizId },
      include: {
        options: true
      },
      orderBy: {
        id: 'asc'
      }
    });
  }

  async getQuestionById(id: number): Promise<Question | null> {
    return await prisma.question.findUnique({
      where: { id },
      include: {
        options: true,
        quiz: {
          include: {
            category: true
          }
        }
      }
    });
  }

  async updateQuestion(
    id: number,
    questionText?: string,
    options?: { optionText: string; isCorrect: boolean }[]
  ): Promise<Question> {
    const existingQuestion = await prisma.question.findUnique({
      where: { id },
      include: { options: true }
    });

    if (!existingQuestion) {
      throw new Error('Question not found');
    }

    // If updating options, validate them
    if (options) {
      const hasCorrectAnswer = options.some(option => option.isCorrect);
      if (!hasCorrectAnswer) {
        throw new Error('At least one option must be marked as correct');
      }

      if (options.length < 2 || options.length > 4) {
        throw new Error('Question must have between 2 and 4 options');
      }
    }

    const updateData: any = {};
    if (questionText !== undefined) {
      updateData.questionText = questionText;
    }

    const question = await prisma.question.update({
      where: { id },
      data: updateData,
      include: {
        options: true,
        quiz: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    // If options are being updated, replace them
    if (options) {
      // Delete existing options
      await prisma.option.deleteMany({
        where: { questionId: id }
      });

      // Create new options
      await prisma.option.createMany({
        data: options.map(option => ({
          questionId: id,
          optionText: option.optionText,
          isCorrect: option.isCorrect
        }))
      });

      // Fetch updated question with new options
      const updatedQuestion = await prisma.question.findUnique({
        where: { id },
        include: {
          options: true,
          quiz: {
            select: {
              id: true,
              title: true
            }
          }
        }
      });

      // Invalidate quiz cache
      await redisService.invalidateQuizCache(existingQuestion.quizId);

      return updatedQuestion!;
    }

    // Invalidate quiz cache
    await redisService.invalidateQuizCache(existingQuestion.quizId);

    return question;
  }

  async deleteQuestion(id: number): Promise<void> {
    const question = await prisma.question.findUnique({
      where: { id },
      select: { quizId: true }
    });

    if (!question) {
      throw new Error('Question not found');
    }

    await prisma.question.delete({
      where: { id }
    });

    // Invalidate quiz cache
    await redisService.invalidateQuizCache(question.quizId);
  }

  async getQuestionStats(quizId: number): Promise<any> {
    const questions = await prisma.question.findMany({
      where: { quizId },
      include: {
        options: true
      }
    });

    const totalQuestions = questions.length;
    const questionsWithMultipleCorrect = questions.filter(
      q => q.options.filter(o => o.isCorrect).length > 1
    ).length;
    const questionsWithSingleCorrect = totalQuestions - questionsWithMultipleCorrect;

    const optionStats = questions.reduce(
      (acc, q) => {
        acc.totalOptions += q.options.length;
        acc.correctOptions += q.options.filter(o => o.isCorrect).length;
        return acc;
      },
      { totalOptions: 0, correctOptions: 0 }
    );

    return {
      totalQuestions,
      questionsWithSingleCorrect,
      questionsWithMultipleCorrect,
      ...optionStats,
      averageOptionsPerQuestion: totalQuestions > 0 ? optionStats.totalOptions / totalQuestions : 0
    };
  }
}

export const questionService = new QuestionService();
