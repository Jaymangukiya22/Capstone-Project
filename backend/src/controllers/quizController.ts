import { Request, Response, NextFunction } from 'express';
import { quizService } from '../services/quizService';
import { createQuizSchema } from '../utils/validation';

export class QuizController {
  async createQuiz(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { error, value } = createQuizSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation error',
          message: error.details[0].message
        });
        return;
      }

      const { title, description, categoryId, difficulty, timeLimit } = value;
      const quiz = await quizService.createQuiz(title, description, categoryId, difficulty, timeLimit);

      res.status(201).json({
        success: true,
        data: quiz,
        message: 'Quiz created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async getQuizById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          error: 'Invalid quiz ID',
          message: 'Quiz ID must be a number'
        });
        return;
      }

      const quiz = await quizService.getQuizById(id);
      if (!quiz) {
        res.status(404).json({
          error: 'Quiz not found',
          message: `Quiz with ID ${id} does not exist`
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: quiz,
        message: 'Quiz retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllQuizzes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
      
      if (categoryId && isNaN(categoryId)) {
        res.status(400).json({
          error: 'Invalid category ID',
          message: 'Category ID must be a number'
        });
        return;
      }

      const quizzes = await quizService.getAllQuizzes(categoryId);

      res.status(200).json({
        success: true,
        data: quizzes,
        count: quizzes.length,
        message: 'Quizzes retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async updateQuiz(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          error: 'Invalid quiz ID',
          message: 'Quiz ID must be a number'
        });
        return;
      }

      const { title, description, categoryId, difficulty, timeLimit } = req.body;
      const quiz = await quizService.updateQuiz(id, title, description, categoryId, difficulty, timeLimit);

      res.status(200).json({
        success: true,
        data: quiz,
        message: 'Quiz updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteQuiz(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          error: 'Invalid quiz ID',
          message: 'Quiz ID must be a number'
        });
        return;
      }

      await quizService.deleteQuiz(id);

      res.status(200).json({
        success: true,
        message: 'Quiz deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async getQuizStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          error: 'Invalid quiz ID',
          message: 'Quiz ID must be a number'
        });
        return;
      }

      const stats = await quizService.getQuizStats(id);

      res.status(200).json({
        success: true,
        data: stats,
        message: 'Quiz statistics retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

export const quizController = new QuizController();
