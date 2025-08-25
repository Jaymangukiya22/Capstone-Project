import { UserRole } from '@prisma/client';
import { prisma } from '@/config/database.config';
import { 
  CreateCourseRequest, 
  UpdateCourseRequest,
  NotFoundError,
  AuthorizationError,
  ConflictError
} from '@/types/index.types';

export class CourseService {
  /**
   * Create a new course
   */
  async createCourse(creatorId: string, data: CreateCourseRequest) {
    // Check if course code already exists
    const existingCourse = await prisma.course.findUnique({
      where: { code: data.code }
    });

    if (existingCourse) {
      throw new ConflictError('Course code already exists');
    }

    const course = await prisma.course.create({
      data: {
        ...data,
        creatorId,
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          }
        },
        _count: {
          select: {
            enrollments: true,
            quizzes: true,
          }
        }
      }
    });

    return course;
  }

  /**
   * Get all courses with pagination and filtering
   */
  async getAllCourses(
    userId: string,
    userRole: UserRole,
    page: number = 1,
    limit: number = 10,
    search?: string,
    isActive?: boolean
  ) {
    const skip = (page - 1) * limit;
    
    let where: any = {};

    // Apply search filter
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Apply active filter
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    // Role-based filtering
    if (userRole === UserRole.FACULTY) {
      where.creatorId = userId;
    } else if (userRole === UserRole.STUDENT) {
      where.AND = [
        where,
        {
          OR: [
            { enrollments: { some: { userId } } },
            { isActive: true } // Students can see all active courses for enrollment
          ]
        }
      ];
    }
    // Admin can see all courses (no additional filtering)

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            }
          },
          _count: {
            select: {
              enrollments: true,
              quizzes: true,
            }
          },
          enrollments: userRole === UserRole.STUDENT ? {
            where: { userId },
            select: { id: true }
          } : false
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.course.count({ where }),
    ]);

    return {
      courses: courses.map(course => ({
        ...course,
        isEnrolled: userRole === UserRole.STUDENT ? course.enrollments.length > 0 : undefined,
        enrollments: undefined // Remove enrollments from response
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Get course by ID
   */
  async getCourseById(courseId: string, userId: string, userRole: UserRole) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          }
        },
        quizzes: {
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            scheduledAt: true,
            createdAt: true,
            _count: {
              select: {
                questions: true,
                matches: true,
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        enrollments: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                avatar: true,
              }
            }
          },
          orderBy: { enrolledAt: 'desc' }
        },
        _count: {
          select: {
            enrollments: true,
            quizzes: true,
          }
        }
      }
    });

    if (!course) {
      throw new NotFoundError('Course not found');
    }

    // Check access permissions
    const isCreator = course.creatorId === userId;
    const isEnrolled = course.enrollments.some(e => e.userId === userId);
    const isAdmin = userRole === UserRole.ADMIN;

    if (!isAdmin && !isCreator && !isEnrolled && userRole === UserRole.STUDENT) {
      throw new AuthorizationError('Access denied to this course');
    }

    return {
      ...course,
      isEnrolled: userRole === UserRole.STUDENT ? isEnrolled : undefined,
      canManage: isAdmin || isCreator,
    };
  }

  /**
   * Update course
   */
  async updateCourse(courseId: string, userId: string, userRole: UserRole, data: UpdateCourseRequest) {
    const course = await prisma.course.findUnique({
      where: { id: courseId }
    });

    if (!course) {
      throw new NotFoundError('Course not found');
    }

    // Check permissions
    if (userRole !== UserRole.ADMIN && course.creatorId !== userId) {
      throw new AuthorizationError('Only course creator or admin can update this course');
    }

    // Check if new code conflicts with existing courses
    if (data.code && data.code !== course.code) {
      const existingCourse = await prisma.course.findUnique({
        where: { code: data.code }
      });

      if (existingCourse) {
        throw new ConflictError('Course code already exists');
      }
    }

    const updatedCourse = await prisma.course.update({
      where: { id: courseId },
      data,
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          }
        },
        _count: {
          select: {
            enrollments: true,
            quizzes: true,
          }
        }
      }
    });

    return updatedCourse;
  }

  /**
   * Delete course
   */
  async deleteCourse(courseId: string, userId: string, userRole: UserRole) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        _count: {
          select: {
            enrollments: true,
            quizzes: true,
          }
        }
      }
    });

    if (!course) {
      throw new NotFoundError('Course not found');
    }

    // Check permissions
    if (userRole !== UserRole.ADMIN && course.creatorId !== userId) {
      throw new AuthorizationError('Only course creator or admin can delete this course');
    }

    // Check if course has enrollments or quizzes
    if (course._count.enrollments > 0 || course._count.quizzes > 0) {
      throw new ConflictError('Cannot delete course with existing enrollments or quizzes');
    }

    await prisma.course.delete({
      where: { id: courseId }
    });

    return { message: 'Course deleted successfully' };
  }

  /**
   * Enroll user in course
   */
  async enrollUser(courseId: string, userId: string, enrolleeId?: string, userRole?: UserRole) {
    const course = await prisma.course.findUnique({
      where: { id: courseId }
    });

    if (!course) {
      throw new NotFoundError('Course not found');
    }

    if (!course.isActive) {
      throw new ConflictError('Cannot enroll in inactive course');
    }

    // Determine who to enroll
    const targetUserId = enrolleeId || userId;

    // Check permissions for enrolling others
    if (enrolleeId && userRole !== UserRole.ADMIN && course.creatorId !== userId) {
      throw new AuthorizationError('Only admin or course creator can enroll other users');
    }

    // Check if already enrolled
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: targetUserId,
          courseId
        }
      }
    });

    if (existingEnrollment) {
      throw new ConflictError('User is already enrolled in this course');
    }

    // Create enrollment
    const enrollment = await prisma.enrollment.create({
      data: {
        userId: targetUserId,
        courseId,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          }
        },
        course: {
          select: {
            id: true,
            title: true,
            code: true,
          }
        }
      }
    });

    // Create initial ELO rating for the user in this course
    await prisma.eloRating.create({
      data: {
        userId: targetUserId,
        courseId,
        rating: 1200, // Starting ELO rating
      }
    });

    return enrollment;
  }

  /**
   * Unenroll user from course
   */
  async unenrollUser(courseId: string, userId: string, unenrolleeId?: string, userRole?: UserRole) {
    const course = await prisma.course.findUnique({
      where: { id: courseId }
    });

    if (!course) {
      throw new NotFoundError('Course not found');
    }

    // Determine who to unenroll
    const targetUserId = unenrolleeId || userId;

    // Check permissions for unenrolling others
    if (unenrolleeId && userRole !== UserRole.ADMIN && course.creatorId !== userId) {
      throw new AuthorizationError('Only admin or course creator can unenroll other users');
    }

    // Check if enrolled
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: targetUserId,
          courseId
        }
      }
    });

    if (!enrollment) {
      throw new NotFoundError('User is not enrolled in this course');
    }

    // Delete enrollment and related data
    await prisma.$transaction([
      prisma.enrollment.delete({
        where: { id: enrollment.id }
      }),
      prisma.eloRating.deleteMany({
        where: {
          userId: targetUserId,
          courseId
        }
      })
    ]);

    return { message: 'Successfully unenrolled from course' };
  }

  /**
   * Get course leaderboard
   */
  async getCourseLeaderboard(courseId: string, limit: number = 10) {
    const course = await prisma.course.findUnique({
      where: { id: courseId }
    });

    if (!course) {
      throw new NotFoundError('Course not found');
    }

    const leaderboard = await prisma.eloRating.findMany({
      where: { courseId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
          }
        }
      },
      orderBy: { rating: 'desc' },
      take: limit,
    });

    return leaderboard.map((entry, index) => ({
      rank: index + 1,
      user: entry.user,
      rating: entry.rating,
      matches: entry.matches,
      wins: entry.wins,
      losses: entry.losses,
      winRate: entry.matches > 0 ? (entry.wins / entry.matches) * 100 : 0,
    }));
  }

  /**
   * Get user's courses
   */
  async getUserCourses(userId: string, userRole: UserRole) {
    if (userRole === UserRole.FACULTY || userRole === UserRole.ADMIN) {
      // Get created courses
      const courses = await prisma.course.findMany({
        where: userRole === UserRole.ADMIN ? {} : { creatorId: userId },
        include: {
          _count: {
            select: {
              enrollments: true,
              quizzes: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return courses;
    } else {
      // Get enrolled courses for students
      const enrollments = await prisma.enrollment.findMany({
        where: { userId },
        include: {
          course: {
            include: {
              creator: {
                select: {
                  id: true,
                  username: true,
                  firstName: true,
                  lastName: true,
                }
              },
              _count: {
                select: {
                  enrollments: true,
                  quizzes: true,
                }
              }
            }
          }
        },
        orderBy: { enrolledAt: 'desc' }
      });

      return enrollments.map(e => e.course);
    }
  }
}
