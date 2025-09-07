import { logInfo, logError } from '../utils/logger';
import { prisma } from '../server';

export interface CreateQuestionData {
  quizId: number;
  questionText: string;
  options: {
    optionText: string;
    isCorrect: boolean;
  }[];
}

export class QuestionService {
  async createQuestion(data: CreateQuestionData): Promise<any> {
    try {
      logInfo('Creating new question', { quizId: data.quizId, questionText: data.questionText });

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
            create: data.options.map(option => ({
              optionText: option.optionText,
              isCorrect: option.isCorrect
            }))
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

      logInfo('Question created successfully', { questionId: question.id, quizId: data.quizId });
      return question;
    } catch (error) {
      logError('Failed to create question', error as Error, { quizId: data.quizId });
      throw error;
    }
  }

  async addQuestionToQuiz(quizId: number, questionText: string, options: { optionText: string; isCorrect: boolean }[]): Promise<any> {
    return this.createQuestion({
      quizId,
      questionText,
      options
    });
  }

  async getQuestionsByQuizId(quizId: number): Promise<any[]> {
    try {
      // Verify quiz exists
      const quiz = await prisma.quiz.findUnique({
        where: { id: quizId }
      });
      
      if (!quiz) {
        const error = new Error('Quiz not found');
        (error as any).statusCode = 400;
        throw error;
      }

      const questions = await prisma.question.findMany({
        where: { quizId },
        include: {
          options: true
        },
        orderBy: {
          id: 'asc'
        }
      });

      logInfo('Retrieved questions for quiz', { quizId, count: questions.length });
      return questions;
    } catch (error) {
      logError('Failed to retrieve questions', error as Error, { quizId });
      throw error;
    }
  }

  async getQuestionById(id: number): Promise<any | null> {
    try {
      const question = await prisma.question.findUnique({
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

      if (question) {
        logInfo('Question retrieved', { questionId: id });
      } else {
        logInfo('Question not found', { questionId: id });
      }

      return question;
    } catch (error) {
      logError('Failed to retrieve question', error as Error, { questionId: id });
      throw error;
    }
  }

  async updateQuestion(
    id: number,
    questionText?: string,
    options?: { optionText: string; isCorrect: boolean }[]
  ): Promise<any> {
    try {
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

      const updatedQuestion = await prisma.question.update({
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
        const finalQuestion = await prisma.question.findUnique({
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

        logInfo('Question updated with new options', { questionId: id });
        return finalQuestion;
      }

      logInfo('Question updated', { questionId: id });
      return updatedQuestion;
    } catch (error) {
      logError('Failed to update question', error as Error, { questionId: id });
      throw error;
    }
  }

  async deleteQuestion(id: number): Promise<boolean> {
    try {
      const question = await prisma.question.findUnique({
        where: { id },
        select: { quizId: true }
      });

      if (!question) {
        logInfo('Question not found for deletion', { questionId: id });
        return false;
      }

      // Delete options first, then question (cascade delete)
      await prisma.option.deleteMany({
        where: { questionId: id }
      });
      
      await prisma.question.delete({
        where: { id }
      });

      logInfo('Question deleted successfully', { questionId: id });
      return true;
    } catch (error) {
      logError('Failed to delete question', error as Error, { questionId: id });
      throw error;
    }
  }

  async getQuestionStats(quizId: number): Promise<any> {
    try {
      const questions = await prisma.question.findMany({
        where: { quizId },
        include: {
          options: true
        }
      });

      const totalQuestions = questions.length;
      // Note: isMcq field not in schema, treating all as MCQ for now
      const mcqQuestions = totalQuestions;
      const booleanQuestions = 0;
      
      const questionsWithMultipleCorrect = questions.filter(
        (q: any) => q.options.filter((o: any) => o.isCorrect).length > 1
      ).length;
      const questionsWithSingleCorrect = totalQuestions - questionsWithMultipleCorrect;

      const optionStats = questions.reduce(
        (acc: any, q: any) => {
          acc.totalOptions += q.options.length;
          acc.correctOptions += q.options.filter((o: any) => o.isCorrect).length;
          return acc;
        },
        { totalOptions: 0, correctOptions: 0 }
      );

      const stats = {
        totalQuestions,
        mcqQuestions,
        booleanQuestions,
        questionsWithSingleCorrect,
        questionsWithMultipleCorrect,
        ...optionStats,
        averageOptionsPerQuestion: totalQuestions > 0 ? optionStats.totalOptions / totalQuestions : 0
      };

      logInfo('Question stats retrieved', { quizId, totalQuestions });
      return stats;
    } catch (error) {
      logError('Failed to retrieve question stats', error as Error, { quizId });
      throw error;
    }
  }
}

export const questionService = new QuestionService();
