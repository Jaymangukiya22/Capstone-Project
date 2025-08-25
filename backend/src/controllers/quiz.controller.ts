import { Request, Response, NextFunction } from 'express';
import { QuizService } from '@/services/quiz.service';
import { 
  AuthenticatedRequest, 
  CreateQuizRequest, 
  CreateQuestionRequest,
  ApiResponse 
} from '@/types/index.types';

export class QuizController {
  private quizService: QuizService;

  constructor() {
    this.quizService = new QuizService();
  }

  /**
   * Create a new quiz
   */
  createQuiz = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        return next(new Error('User not authenticated'));
      }

      const quizData: CreateQuizRequest = req.body;
      const quiz = await this.quizService.createQuiz(req.user.id, quizData);

      const response: ApiResponse = {
        success: true,
        message: 'Quiz created successfully',
        data: quiz,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get quiz by ID
   */
  getQuizById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        return next(new Error('User not authenticated'));
      }

      const { quizId } = req.params;
      const quiz = await this.quizService.getQuizById(quizId, req.user.id, req.user.role);

      const response: ApiResponse = {
        success: true,
        message: 'Quiz retrieved successfully',
        data: quiz,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update quiz
   */
  updateQuiz = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        return next(new Error('User not authenticated'));
      }

      const { quizId } = req.params;
      const updateData = req.body;
      const quiz = await this.quizService.updateQuiz(quizId, req.user.id, req.user.role, updateData);

      const response: ApiResponse = {
        success: true,
        message: 'Quiz updated successfully',
        data: quiz,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete quiz
   */
  deleteQuiz = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        return next(new Error('User not authenticated'));
      }

      const { quizId } = req.params;
      const result = await this.quizService.deleteQuiz(quizId, req.user.id, req.user.role);

      const response: ApiResponse = {
        success: true,
        message: result.message,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Add question to quiz
   */
  addQuestion = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        return next(new Error('User not authenticated'));
      }

      const { quizId } = req.params;
      const questionData: CreateQuestionRequest = req.body;
      const question = await this.quizService.addQuestion(quizId, req.user.id, req.user.role, questionData);

      const response: ApiResponse = {
        success: true,
        message: 'Question added successfully',
        data: question,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update question
   */
  updateQuestion = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        return next(new Error('User not authenticated'));
      }

      const { questionId } = req.params;
      const updateData = req.body;
      const question = await this.quizService.updateQuestion(questionId, req.user.id, req.user.role, updateData);

      const response: ApiResponse = {
        success: true,
        message: 'Question updated successfully',
        data: question,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete question
   */
  deleteQuestion = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        return next(new Error('User not authenticated'));
      }

      const { questionId } = req.params;
      const result = await this.quizService.deleteQuestion(questionId, req.user.id, req.user.role);

      const response: ApiResponse = {
        success: true,
        message: result.message,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get quizzes for a course
   */
  getCourseQuizzes = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        return next(new Error('User not authenticated'));
      }

      const { courseId } = req.params;
      const { page, limit } = req.query as any;
      
      const result = await this.quizService.getCourseQuizzes(
        courseId,
        req.user.id,
        req.user.role,
        parseInt(page) || 1,
        parseInt(limit) || 10
      );

      const response: ApiResponse = {
        success: true,
        message: 'Course quizzes retrieved successfully',
        data: result.quizzes,
      };

      (response as any).pagination = result.pagination;

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Schedule quiz
   */
  scheduleQuiz = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        return next(new Error('User not authenticated'));
      }

      const { quizId } = req.params;
      const { scheduledAt } = req.body;
      
      const quiz = await this.quizService.scheduleQuiz(
        quizId,
        req.user.id,
        req.user.role,
        new Date(scheduledAt)
      );

      const response: ApiResponse = {
        success: true,
        message: 'Quiz scheduled successfully',
        data: quiz,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get upcoming quizzes
   */
  getUpcomingQuizzes = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        return next(new Error('User not authenticated'));
      }

      const quizzes = await this.quizService.getUpcomingQuizzes(req.user.id, req.user.role);

      const response: ApiResponse = {
        success: true,
        message: 'Upcoming quizzes retrieved successfully',
        data: quizzes,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };
}
