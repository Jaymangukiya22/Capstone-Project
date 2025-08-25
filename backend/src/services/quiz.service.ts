import { QuizStatus, UserRole } from '@prisma/client';
import { prisma } from '@/config/database.config';
import { 
  CreateQuizRequest, 
  CreateQuestionRequest,
  NotFoundError,
  AuthorizationError,
  ConflictError,
  ValidationError
} from '@/types/index.types';

export class QuizService {
  /**
   * Create a new quiz
   */
  async createQuiz(creatorId: string, data: CreateQuizRequest) {
    // Verify course exists and user has access
    const course = await prisma.course.findUnique({
      where: { id: data.courseId }
    });

    if (!course) {
      throw new NotFoundError('Course not found');
    }

    // Check if user is course creator or admin
    const user = await prisma.user.findUnique({
      where: { id: creatorId }
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.role !== UserRole.ADMIN && course.creatorId !== creatorId) {
      throw new AuthorizationError('Only course creator or admin can create quizzes');
    }

    const quiz = await prisma.quiz.create({
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
        course: {
          select: {
            id: true,
            title: true,
            code: true,
          }
        },
        _count: {
          select: {
            questions: true,
            matches: true,
          }
        }
      }
    });

    return quiz;
  }

  /**
   * Get quiz by ID
   */
  async getQuizById(quizId: string, userId: string, userRole: UserRole) {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          }
        },
        course: {
          select: {
            id: true,
            title: true,
            code: true,
            creatorId: true,
          }
        },
        questions: {
          include: {
            options: {
              select: {
                id: true,
                text: true,
                imageUrl: true,
                isCorrect: userRole !== UserRole.STUDENT, // Hide correct answers from students
                order: true,
              },
              orderBy: { order: 'asc' }
            }
          },
          orderBy: { order: 'asc' }
        },
        _count: {
          select: {
            questions: true,
            matches: true,
          }
        }
      }
    });

    if (!quiz) {
      throw new NotFoundError('Quiz not found');
    }

    // Check access permissions
    const isCreator = quiz.creatorId === userId;
    const isCourseCreator = quiz.course.creatorId === userId;
    const isAdmin = userRole === UserRole.ADMIN;
    
    // Check if student is enrolled in the course
    let isEnrolled = false;
    if (userRole === UserRole.STUDENT) {
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId: quiz.course.id
          }
        }
      });
      isEnrolled = !!enrollment;
    }

    if (!isAdmin && !isCreator && !isCourseCreator && !isEnrolled) {
      throw new AuthorizationError('Access denied to this quiz');
    }

    return {
      ...quiz,
      canManage: isAdmin || isCreator || isCourseCreator,
      canPlay: isEnrolled || isAdmin || isCreator || isCourseCreator,
    };
  }

  /**
   * Update quiz
   */
  async updateQuiz(quizId: string, userId: string, userRole: UserRole, data: any) {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        course: true
      }
    });

    if (!quiz) {
      throw new NotFoundError('Quiz not found');
    }

    // Check permissions
    const isCreator = quiz.creatorId === userId;
    const isCourseCreator = quiz.course.creatorId === userId;
    const isAdmin = userRole === UserRole.ADMIN;

    if (!isAdmin && !isCreator && !isCourseCreator) {
      throw new AuthorizationError('Only quiz creator, course creator, or admin can update this quiz');
    }

    // Prevent updating active or completed quizzes
    if (quiz.status === QuizStatus.ACTIVE || quiz.status === QuizStatus.COMPLETED) {
      throw new ConflictError('Cannot update active or completed quiz');
    }

    const updatedQuiz = await prisma.quiz.update({
      where: { id: quizId },
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
        course: {
          select: {
            id: true,
            title: true,
            code: true,
          }
        },
        _count: {
          select: {
            questions: true,
            matches: true,
          }
        }
      }
    });

    return updatedQuiz;
  }

  /**
   * Delete quiz
   */
  async deleteQuiz(quizId: string, userId: string, userRole: UserRole) {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        course: true,
        _count: {
          select: {
            matches: true,
          }
        }
      }
    });

    if (!quiz) {
      throw new NotFoundError('Quiz not found');
    }

    // Check permissions
    const isCreator = quiz.creatorId === userId;
    const isCourseCreator = quiz.course.creatorId === userId;
    const isAdmin = userRole === UserRole.ADMIN;

    if (!isAdmin && !isCreator && !isCourseCreator) {
      throw new AuthorizationError('Only quiz creator, course creator, or admin can delete this quiz');
    }

    // Prevent deleting quiz with matches
    if (quiz._count.matches > 0) {
      throw new ConflictError('Cannot delete quiz with existing matches');
    }

    await prisma.quiz.delete({
      where: { id: quizId }
    });

    return { message: 'Quiz deleted successfully' };
  }

  /**
   * Add question to quiz
   */
  async addQuestion(quizId: string, userId: string, userRole: UserRole, data: CreateQuestionRequest) {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        course: true,
        _count: {
          select: {
            questions: true,
          }
        }
      }
    });

    if (!quiz) {
      throw new NotFoundError('Quiz not found');
    }

    // Check permissions
    const isCreator = quiz.creatorId === userId;
    const isCourseCreator = quiz.course.creatorId === userId;
    const isAdmin = userRole === UserRole.ADMIN;

    if (!isAdmin && !isCreator && !isCourseCreator) {
      throw new AuthorizationError('Only quiz creator, course creator, or admin can add questions');
    }

    // Prevent adding questions to active or completed quizzes
    if (quiz.status === QuizStatus.ACTIVE || quiz.status === QuizStatus.COMPLETED) {
      throw new ConflictError('Cannot add questions to active or completed quiz');
    }

    // Validate options
    const correctOptions = data.options.filter(option => option.isCorrect);
    if (correctOptions.length !== 1) {
      throw new ValidationError('Exactly one option must be marked as correct');
    }

    const question = await prisma.question.create({
      data: {
        text: data.text,
        imageUrl: data.imageUrl,
        timeLimit: data.timeLimit,
        points: data.points || 100,
        order: quiz._count.questions + 1,
        quizId,
        options: {
          create: data.options.map((option, index) => ({
            text: option.text,
            imageUrl: option.imageUrl,
            isCorrect: option.isCorrect,
            order: index + 1,
          }))
        }
      },
      include: {
        options: {
          orderBy: { order: 'asc' }
        }
      }
    });

    return question;
  }

  /**
   * Update question
   */
  async updateQuestion(questionId: string, userId: string, userRole: UserRole, data: any) {
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        quiz: {
          include: {
            course: true
          }
        }
      }
    });

    if (!question) {
      throw new NotFoundError('Question not found');
    }

    // Check permissions
    const isCreator = question.quiz.creatorId === userId;
    const isCourseCreator = question.quiz.course.creatorId === userId;
    const isAdmin = userRole === UserRole.ADMIN;

    if (!isAdmin && !isCreator && !isCourseCreator) {
      throw new AuthorizationError('Only quiz creator, course creator, or admin can update questions');
    }

    // Prevent updating questions in active or completed quizzes
    if (question.quiz.status === QuizStatus.ACTIVE || question.quiz.status === QuizStatus.COMPLETED) {
      throw new ConflictError('Cannot update questions in active or completed quiz');
    }

    const updatedQuestion = await prisma.question.update({
      where: { id: questionId },
      data,
      include: {
        options: {
          orderBy: { order: 'asc' }
        }
      }
    });

    return updatedQuestion;
  }

  /**
   * Delete question
   */
  async deleteQuestion(questionId: string, userId: string, userRole: UserRole) {
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        quiz: {
          include: {
            course: true
          }
        },
        _count: {
          select: {
            answers: true,
          }
        }
      }
    });

    if (!question) {
      throw new NotFoundError('Question not found');
    }

    // Check permissions
    const isCreator = question.quiz.creatorId === userId;
    const isCourseCreator = question.quiz.course.creatorId === userId;
    const isAdmin = userRole === UserRole.ADMIN;

    if (!isAdmin && !isCreator && !isCourseCreator) {
      throw new AuthorizationError('Only quiz creator, course creator, or admin can delete questions');
    }

    // Prevent deleting questions with answers
    if (question._count.answers > 0) {
      throw new ConflictError('Cannot delete question with existing answers');
    }

    await prisma.question.delete({
      where: { id: questionId }
    });

    return { message: 'Question deleted successfully' };
  }

  /**
   * Get quizzes for a course
   */
  async getCourseQuizzes(courseId: string, userId: string, userRole: UserRole, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    // Check course access
    const course = await prisma.course.findUnique({
      where: { id: courseId }
    });

    if (!course) {
      throw new NotFoundError('Course not found');
    }

    // Check permissions
    const isCreator = course.creatorId === userId;
    const isAdmin = userRole === UserRole.ADMIN;
    
    let isEnrolled = false;
    if (userRole === UserRole.STUDENT) {
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId
          }
        }
      });
      isEnrolled = !!enrollment;
    }

    if (!isAdmin && !isCreator && !isEnrolled) {
      throw new AuthorizationError('Access denied to this course');
    }

    // Filter quizzes based on role
    let where: any = { courseId };
    if (userRole === UserRole.STUDENT) {
      // Students can only see scheduled, active, or completed quizzes
      where.status = {
        in: [QuizStatus.SCHEDULED, QuizStatus.ACTIVE, QuizStatus.COMPLETED]
      };
    }

    const [quizzes, total] = await Promise.all([
      prisma.quiz.findMany({
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
              questions: true,
              matches: true,
            }
          }
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.quiz.count({ where }),
    ]);

    return {
      quizzes,
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
   * Schedule quiz
   */
  async scheduleQuiz(quizId: string, userId: string, userRole: UserRole, scheduledAt: Date) {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        course: true,
        _count: {
          select: {
            questions: true,
          }
        }
      }
    });

    if (!quiz) {
      throw new NotFoundError('Quiz not found');
    }

    // Check permissions
    const isCreator = quiz.creatorId === userId;
    const isCourseCreator = quiz.course.creatorId === userId;
    const isAdmin = userRole === UserRole.ADMIN;

    if (!isAdmin && !isCreator && !isCourseCreator) {
      throw new AuthorizationError('Only quiz creator, course creator, or admin can schedule quiz');
    }

    // Validate quiz has questions
    if (quiz._count.questions === 0) {
      throw new ValidationError('Cannot schedule quiz without questions');
    }

    // Validate scheduled time is in the future
    if (scheduledAt <= new Date()) {
      throw new ValidationError('Scheduled time must be in the future');
    }

    const updatedQuiz = await prisma.quiz.update({
      where: { id: quizId },
      data: {
        scheduledAt,
        status: QuizStatus.SCHEDULED,
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
        course: {
          select: {
            id: true,
            title: true,
            code: true,
          }
        },
        _count: {
          select: {
            questions: true,
            matches: true,
          }
        }
      }
    });

    return updatedQuiz;
  }

  /**
   * Get upcoming quizzes for a user
   */
  async getUpcomingQuizzes(userId: string, userRole: UserRole) {
    let where: any = {
      status: QuizStatus.SCHEDULED,
      scheduledAt: {
        gte: new Date()
      }
    };

    if (userRole === UserRole.STUDENT) {
      // Students can only see quizzes from courses they're enrolled in
      where.course = {
        enrollments: {
          some: { userId }
        }
      };
    } else if (userRole === UserRole.FACULTY) {
      // Faculty can see quizzes from courses they created
      where.course = {
        creatorId: userId
      };
    }
    // Admin can see all upcoming quizzes

    const quizzes = await prisma.quiz.findMany({
      where,
      include: {
        course: {
          select: {
            id: true,
            title: true,
            code: true,
          }
        },
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
            questions: true,
          }
        }
      },
      orderBy: { scheduledAt: 'asc' },
      take: 10,
    });

    return quizzes;
  }
}
