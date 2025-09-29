import { logInfo, logError } from '../utils/logger';
import { QuestionBankItem, QuestionBankOption, Category, User } from '../models';
import { Difficulty } from '../models/QuestionBankItem';
import { Op } from 'sequelize';

export interface CreateQuestionData {
  categoryId: number;
  createdById: number;
  questionText: string;
  difficulty?: Difficulty;
  options: {
    optionText: string;
    isCorrect: boolean;
  }[];
}

export interface UpdateQuestionData {
  questionText?: string;
  difficulty?: Difficulty;
  options?: {
    optionText: string;
    isCorrect: boolean;
  }[];
}

export interface QuestionFilters {
  categoryId?: number;
  difficulty?: Difficulty;
  search?: string;
  page?: number;
  limit?: number;
}

export class QuestionService {
  async createQuestion(data: CreateQuestionData): Promise<any> {
    try {
      logInfo('Creating new question', { categoryId: data.categoryId, questionText: data.questionText });

      // Validate category exists
      const category = await Category.findByPk(data.categoryId);
      if (!category) {
        throw new Error('Category not found');
      }

      // Validate at least one correct answer
      const hasCorrectAnswer = data.options.some(option => option.isCorrect);
      if (!hasCorrectAnswer) {
        throw new Error('At least one option must be marked as correct');
      }

      // Create the question
      const question = await QuestionBankItem.create({
        categoryId: data.categoryId,
        createdById: data.createdById,
        questionText: data.questionText,
        difficulty: data.difficulty || Difficulty.MEDIUM,
        isActive: true
      });

      // Create the options
      const options = await QuestionBankOption.bulkCreate(
        data.options.map(option => ({
          questionId: question.id,
          optionText: option.optionText,
          isCorrect: option.isCorrect
        }))
      );

      // Fetch the complete question with associations
      const completeQuestion = await QuestionBankItem.findByPk(question.id, {
        include: [
          { model: QuestionBankOption, as: 'options' },
          { model: Category, as: 'category' },
          { 
            model: User, 
            as: 'createdBy',
            attributes: ['id', 'username']
          }
        ]
      });

      logInfo('Question created successfully', { questionId: question.id });
      return completeQuestion;
    } catch (error) {
      logError('Failed to create question', error as Error, { questionText: data.questionText });
      throw error;
    }
  }

  async getQuestionsByCategory(categoryId: number, page = 1, limit = 20): Promise<any> {
    try {
      const offset = (page - 1) * limit;

      const [questions, total] = await Promise.all([
        QuestionBankItem.findAll({
          where: { 
            categoryId,
            isActive: true 
          },
          include: [
            { model: QuestionBankOption, as: 'options' },
            { model: Category, as: 'category' },
            { 
              model: User, 
              as: 'createdBy',
              attributes: ['id', 'username']
            }
          ],
          order: [['createdAt', 'DESC']],
          offset,
          limit
        }),
        QuestionBankItem.count({
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
      logError('Failed to get questions by category', error as Error, { categoryId });
      throw error;
    }
  }

  async getQuestionById(id: number): Promise<any> {
    try {
      const question = await QuestionBankItem.findOne({
        where: { id, isActive: true },
        include: [
          { model: QuestionBankOption, as: 'options' },
          { model: Category, as: 'category' },
          { 
            model: User, 
            as: 'createdBy',
            attributes: ['id', 'username']
          }
        ]
      });

      if (!question) {
        throw new Error('Question not found');
      }

      return question;
    } catch (error) {
      logError('Failed to get question by ID', error as Error, { questionId: id });
      throw error;
    }
  }

  async updateQuestion(id: number, data: UpdateQuestionData): Promise<any> {
    try {
      // Check if question exists
      const existingQuestion = await QuestionBankItem.findByPk(id);
      if (!existingQuestion) {
        throw new Error('Question not found');
      }

      // Update the question
      await QuestionBankItem.update({
        questionText: data.questionText,
        difficulty: data.difficulty
      }, {
        where: { id }
      });

      // Update options if provided
      if (data.options) {
        // Validate at least one correct answer
        const hasCorrectAnswer = data.options.some(option => option.isCorrect);
        if (!hasCorrectAnswer) {
          throw new Error('At least one option must be marked as correct');
        }

        // Delete existing options
        await QuestionBankOption.destroy({
          where: { questionId: id }
        });

        // Create new options
        await QuestionBankOption.bulkCreate(
          data.options.map(option => ({
            questionId: id,
            optionText: option.optionText,
            isCorrect: option.isCorrect
          }))
        );
      }

      // Fetch updated question
      const updatedQuestion = await QuestionBankItem.findByPk(id, {
        include: [
          { model: QuestionBankOption, as: 'options' },
          { model: Category, as: 'category' },
          { 
            model: User, 
            as: 'createdBy',
            attributes: ['id', 'username']
          }
        ]
      });

      logInfo('Question updated successfully', { questionId: id });
      return updatedQuestion;
    } catch (error) {
      logError('Failed to update question', error as Error, { questionId: id });
      throw error;
    }
  }

  async deleteQuestion(id: number): Promise<boolean> {
    try {
      // Soft delete - mark as inactive
      await QuestionBankItem.update(
        { isActive: false },
        { where: { id } }
      );

      logInfo('Question deleted (soft delete)', { questionId: id });
      return true;
    } catch (error) {
      logError('Failed to delete question', error as Error, { questionId: id });
      throw error;
    }
  }

  async searchQuestions(filters: QuestionFilters): Promise<any> {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const offset = (page - 1) * limit;

      const where: any = { isActive: true };

      if (filters.categoryId) {
        where.categoryId = filters.categoryId;
      }

      if (filters.difficulty) {
        where.difficulty = filters.difficulty;
      }

      if (filters.search) {
        where.questionText = {
          [Op.iLike]: `%${filters.search}%`
        };
      }

      const [questions, total] = await Promise.all([
        QuestionBankItem.findAll({
          where,
          include: [
            { model: QuestionBankOption, as: 'options' },
            { model: Category, as: 'category' },
            { 
              model: User, 
              as: 'createdBy',
              attributes: ['id', 'username']
            }
          ],
          order: [['createdAt', 'DESC']],
          offset,
          limit
        }),
        QuestionBankItem.count({ where })
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
      logError('Failed to search questions', error as Error, filters);
      throw error;
    }
  }

  async getRandomQuestions(categoryId?: number, difficulty?: Difficulty, count = 10): Promise<any> {
    try {
      const where: any = { isActive: true };

      if (categoryId) {
        where.categoryId = categoryId;
      }

      if (difficulty) {
        where.difficulty = difficulty;
      }

      const questions = await QuestionBankItem.findAll({
        where,
        include: [
          { model: QuestionBankOption, as: 'options' },
          { model: Category, as: 'category' }
        ],
        order: [['createdAt', 'DESC']], // TODO: Implement proper random ordering
        limit: count
      });

      return questions;
    } catch (error) {
      logError('Failed to get random questions', error as Error, { categoryId, difficulty, count });
      throw error;
    }
  }

  async addQuestionToQuiz(quizId: number, questionText: string, options: any[]): Promise<any> {
    try {
      // This method is deprecated - questions are now managed through question banks
      // For backward compatibility, we'll create a question in the default category
      logInfo('Adding question to quiz (deprecated method)', { quizId, questionText });
      
      // Find or create a default category
      let defaultCategory = await Category.findOne({ where: { name: 'General' } });
      if (!defaultCategory) {
        defaultCategory = await Category.create({
          name: 'General',
          description: 'Default category for quiz questions'
        });
      }

      // Create question data
      const questionData: CreateQuestionData = {
        categoryId: defaultCategory.id,
        createdById: 1, // Default admin user
        questionText,
        difficulty: Difficulty.MEDIUM,
        options
      };

      return await this.createQuestion(questionData);
    } catch (error) {
      logError('Failed to add question to quiz', error as Error, { quizId, questionText });
      throw error;
    }
  }

  async getQuestionsByQuizId(quizId: number): Promise<any> {
    try {
      // This method is deprecated - questions are now managed through question banks
      // For backward compatibility, we'll return questions from the quiz's assigned questions
      logInfo('Getting questions by quiz ID (deprecated method)', { quizId });
      
      // Since we don't have a direct quiz-question relationship anymore,
      // we'll return all questions from the same category as the quiz
      // This is a simplified implementation for backward compatibility
      
      const questions = await QuestionBankItem.findAll({
        where: { isActive: true },
        include: [
          { model: QuestionBankOption, as: 'options' },
          { model: Category, as: 'category' },
          { 
            model: User, 
            as: 'createdBy',
            attributes: ['id', 'username']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: 20 // Limit for performance
      });

      return questions;
    } catch (error) {
      logError('Failed to get questions by quiz ID', error as Error, { quizId });
      throw error;
    }
  }

  async getQuestionStats(quizId: number): Promise<any> {
    try {
      logInfo('Getting question statistics', { quizId });
      
      // Get basic statistics about questions
      const totalQuestions = await QuestionBankItem.count({
        where: { isActive: true }
      });

      const questionsByDifficulty = await QuestionBankItem.findAll({
        where: { isActive: true },
        attributes: [
          'difficulty',
          [QuestionBankItem.sequelize!.fn('COUNT', QuestionBankItem.sequelize!.col('id')), 'count']
        ],
        group: ['difficulty'],
        raw: true
      });

      const questionsByCategory = await QuestionBankItem.findAll({
        where: { isActive: true },
        include: [
          { 
            model: Category, 
            as: 'category',
            attributes: ['name']
          }
        ],
        attributes: [
          'categoryId',
          [QuestionBankItem.sequelize!.fn('COUNT', QuestionBankItem.sequelize!.col('QuestionBankItem.id')), 'count']
        ],
        group: ['categoryId', 'category.id', 'category.name'],
        raw: true
      });

      return {
        totalQuestions,
        byDifficulty: questionsByDifficulty,
        byCategory: questionsByCategory
      };
    } catch (error) {
      logError('Failed to get question statistics', error as Error, { quizId });
      throw error;
    }
  }
}

export const questionService = new QuestionService();
