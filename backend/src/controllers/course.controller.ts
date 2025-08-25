import { Request, Response, NextFunction } from 'express';
import { CourseService } from '@/services/course.service';
import { 
  AuthenticatedRequest, 
  CreateCourseRequest, 
  UpdateCourseRequest,
  ApiResponse 
} from '@/types/index.types';

export class CourseController {
  private courseService: CourseService;

  constructor() {
    this.courseService = new CourseService();
  }

  /**
   * Create a new course
   */
  createCourse = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        return next(new Error('User not authenticated'));
      }

      const courseData: CreateCourseRequest = req.body;
      const course = await this.courseService.createCourse(req.user.id, courseData);

      const response: ApiResponse = {
        success: true,
        message: 'Course created successfully',
        data: course,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get all courses
   */
  getAllCourses = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        return next(new Error('User not authenticated'));
      }

      const { page, limit, search, isActive } = req.query as any;
      const result = await this.courseService.getAllCourses(
        req.user.id,
        req.user.role,
        parseInt(page) || 1,
        parseInt(limit) || 10,
        search,
        isActive !== undefined ? isActive === 'true' : undefined
      );

      const response: ApiResponse = {
        success: true,
        message: 'Courses retrieved successfully',
        data: result.courses,
      };

      (response as any).pagination = result.pagination;

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get course by ID
   */
  getCourseById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        return next(new Error('User not authenticated'));
      }

      const { courseId } = req.params;
      const course = await this.courseService.getCourseById(courseId, req.user.id, req.user.role);

      const response: ApiResponse = {
        success: true,
        message: 'Course retrieved successfully',
        data: course,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update course
   */
  updateCourse = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        return next(new Error('User not authenticated'));
      }

      const { courseId } = req.params;
      const updateData: UpdateCourseRequest = req.body;
      const course = await this.courseService.updateCourse(courseId, req.user.id, req.user.role, updateData);

      const response: ApiResponse = {
        success: true,
        message: 'Course updated successfully',
        data: course,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete course
   */
  deleteCourse = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        return next(new Error('User not authenticated'));
      }

      const { courseId } = req.params;
      const result = await this.courseService.deleteCourse(courseId, req.user.id, req.user.role);

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
   * Enroll in course
   */
  enrollInCourse = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        return next(new Error('User not authenticated'));
      }

      const { courseId } = req.params;
      const { userId: enrolleeId } = req.body;
      
      const enrollment = await this.courseService.enrollUser(
        courseId, 
        req.user.id, 
        enrolleeId, 
        req.user.role
      );

      const response: ApiResponse = {
        success: true,
        message: 'Successfully enrolled in course',
        data: enrollment,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Unenroll from course
   */
  unenrollFromCourse = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        return next(new Error('User not authenticated'));
      }

      const { courseId } = req.params;
      const { userId: unenrolleeId } = req.body;
      
      const result = await this.courseService.unenrollUser(
        courseId, 
        req.user.id, 
        unenrolleeId, 
        req.user.role
      );

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
   * Get course leaderboard
   */
  getCourseLeaderboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { courseId } = req.params;
      const { limit } = req.query as any;
      
      const leaderboard = await this.courseService.getCourseLeaderboard(
        courseId, 
        parseInt(limit) || 10
      );

      const response: ApiResponse = {
        success: true,
        message: 'Leaderboard retrieved successfully',
        data: leaderboard,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get user's courses
   */
  getUserCourses = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        return next(new Error('User not authenticated'));
      }

      const courses = await this.courseService.getUserCourses(req.user.id, req.user.role);

      const response: ApiResponse = {
        success: true,
        message: 'User courses retrieved successfully',
        data: courses,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };
}
