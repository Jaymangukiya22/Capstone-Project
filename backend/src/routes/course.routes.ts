import { Router } from 'express';
import { CourseController } from '@/controllers/course.controller';
import { 
  authenticate, 
  requireFaculty, 
  requireCourseAccess,
  optionalAuth 
} from '@/middleware/auth.middleware';
import { 
  validate, 
  validateQuery,
  courseSchemas,
  querySchemas 
} from '@/middleware/validation.middleware';

const router = Router();
const courseController = new CourseController();

// Public routes (with optional auth for enrollment status)
router.get('/:courseId/leaderboard', optionalAuth, courseController.getCourseLeaderboard);

// Protected routes
router.use(authenticate); // All routes below require authentication

// Course CRUD operations
router.post('/', requireFaculty, validate(courseSchemas.create), courseController.createCourse);
router.get('/', validateQuery(querySchemas.pagination), courseController.getAllCourses);
router.get('/my-courses', courseController.getUserCourses);
router.get('/:courseId', requireCourseAccess, courseController.getCourseById);
router.put('/:courseId', requireCourseAccess, validate(courseSchemas.update), courseController.updateCourse);
router.delete('/:courseId', requireCourseAccess, courseController.deleteCourse);

// Enrollment operations
router.post('/:courseId/enroll', validate(courseSchemas.enroll), courseController.enrollInCourse);
router.delete('/:courseId/unenroll', validate(courseSchemas.enroll), courseController.unenrollFromCourse);

export default router;
