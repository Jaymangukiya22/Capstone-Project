import { Request, Response, NextFunction } from 'express';
import { questionService } from '../services/questionService';
import { validateQuestion } from '../utils/validation';

export class QuestionController {
  async createQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { error, value } = validateQuestion(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          message: error.details[0].message
        });
        return;
      }

      const question = await questionService.createQuestion(value);

      res.status(201).json({
        success: true,
        data: question,
        message: 'Question created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async addQuestionToQuiz(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const quizId = parseInt(req.params.quizId);
      if (isNaN(quizId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid quiz ID',
          message: 'Quiz ID must be a number'
        });
        return;
      }

      const { error, value } = validateQuestion(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          message: error.details[0].message
        });
        return;
      }

      const { questionText, options } = value;
      const createdQuestion = await questionService.addQuestionToQuiz(quizId, questionText, options);

      res.status(201).json({
        success: true,
        data: createdQuestion,
        message: 'Question added to quiz successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async getQuestionsByQuizId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const quizId = parseInt(req.params.quizId);
      if (isNaN(quizId)) {
        res.status(400).json({
          error: 'Invalid quiz ID',
          message: 'Quiz ID must be a number'
        });
        return;
      }

      const questions = await questionService.getQuestionsByQuizId(quizId);

      res.status(200).json({
        success: true,
        data: questions,
        count: questions.length,
        message: 'Questions retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async getQuestionById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          error: 'Invalid question ID',
          message: 'Question ID must be a number'
        });
        return;
      }

      const question = await questionService.getQuestionById(id);
      if (!question) {
        res.status(404).json({
          error: 'Question not found',
          message: `Question with ID ${id} does not exist`
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: question,
        message: 'Question retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async updateQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: 'Invalid question ID',
          message: 'Question ID must be a number'
        });
        return;
      }

      const { questionText, options } = req.body;
      
      const updatedQuestion = await questionService.updateQuestion(id, questionText, options);

      res.status(200).json({
        success: true,
        data: updatedQuestion,
        message: 'Question updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          error: 'Invalid question ID',
          message: 'Question ID must be a number'
        });
        return;
      }

      await questionService.deleteQuestion(id);

      res.status(200).json({
        success: true,
        message: 'Question deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async getQuestionStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const quizId = parseInt(req.params.quizId);
      if (isNaN(quizId)) {
        res.status(400).json({
          error: 'Invalid quiz ID',
          message: 'Quiz ID must be a number'
        });
        return;
      }

      const stats = await questionService.getQuestionStats(quizId);

      res.status(200).json({
        success: true,
        data: stats,
        message: 'Question statistics retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

export const questionController = new QuestionController();
