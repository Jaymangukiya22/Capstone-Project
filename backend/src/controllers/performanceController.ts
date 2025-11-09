import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { logError, logInfo } from '../utils/logger';
import { QuizAttempt } from '../models/QuizAttempt';
import { Quiz } from '../models/Quiz';
import { User } from '../models/User';
import { Category } from '../models/Category';
import { Op } from 'sequelize';

export const getQuizPerformanceData = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { quizId, startDate, endDate, categoryId } = req.query;
    
    // Build where clause for filtering
    const whereClause: any = {};
    const quizWhereClause: any = {};
    
    if (quizId) {
      whereClause.quizId = parseInt(quizId as string);
    }
    
    if (startDate && endDate) {
      whereClause.createdAt = {
        [Op.between]: [new Date(startDate as string), new Date(endDate as string)]
      };
    }
    
    if (categoryId) {
      quizWhereClause.categoryId = parseInt(categoryId as string);
    }
    
    // Fetch quiz attempts with related data
    const quizAttempts = await QuizAttempt.findAll({
      where: whereClause,
      include: [
        {
          model: Quiz,
          as: 'quiz',
          where: quizWhereClause,
          required: true,
          include: [
            {
              model: Category,
              as: 'category',
              attributes: ['id', 'name']
            }
          ],
          attributes: ['id', 'title', 'description', 'difficulty', 'timeLimit', 'categoryId']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'firstName', 'lastName']
        }
      ],
      order: [['createdAt', 'DESC']],
      attributes: ['id', 'userId', 'quizId', 'status', 'score', 'totalQuestions', 'correctAnswers', 'timeSpent', 'startedAt', 'completedAt', 'createdAt']
    });
    
    // Group attempts by quiz
    const quizPerformanceMap = new Map();
    
    quizAttempts.forEach(attempt => {
      const quizId = attempt.quizId;
      
      if (!quizPerformanceMap.has(quizId)) {
        quizPerformanceMap.set(quizId, {
          quiz: {
            id: attempt.quiz.id,
            title: attempt.quiz.title,
            description: attempt.quiz.description,
            difficulty: attempt.quiz.difficulty,
            timeLimit: attempt.quiz.timeLimit,
            category: attempt.quiz.category
          },
          attempts: [],
          statistics: {
            totalAttempts: 0,
            completedAttempts: 0,
            averageScore: 0,
            highestScore: 0,
            lowestScore: null as number | null,
            averageTimeSpent: 0,
            passRate: 0 // Assuming 60% is passing
          }
        });
      }
      
      const performanceData = quizPerformanceMap.get(quizId);
      
      // Add attempt to the list
      performanceData.attempts.push({
        id: attempt.id,
        user: {
          id: attempt.user.id,
          username: attempt.user.username,
          email: attempt.user.email,
          fullName: `${attempt.user.firstName || ''} ${attempt.user.lastName || ''}`.trim() || attempt.user.username
        },
        status: attempt.status,
        score: attempt.score,
        totalQuestions: attempt.totalQuestions,
        correctAnswers: attempt.correctAnswers,
        percentage: attempt.totalQuestions > 0 ? Math.round((attempt.correctAnswers / attempt.totalQuestions) * 100) : 0,
        timeSpent: attempt.timeSpent,
        startedAt: attempt.startedAt,
        completedAt: attempt.completedAt,
        createdAt: attempt.createdAt
      });
    });
    
    // Calculate statistics for each quiz
    const quizPerformanceData = Array.from(quizPerformanceMap.values()).map(data => {
      const completedAttempts = data.attempts.filter((a: any) => a.status === 'COMPLETED');
      const scores = completedAttempts.map((a: any) => a.percentage);
      const timesSpent = completedAttempts.filter((a: any) => a.timeSpent).map((a: any) => a.timeSpent);
      
      data.statistics.totalAttempts = data.attempts.length;
      data.statistics.completedAttempts = completedAttempts.length;
      
      if (scores.length > 0) {
        data.statistics.averageScore = Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length);
        data.statistics.highestScore = Math.max(...scores);
        data.statistics.lowestScore = Math.min(...scores);
        data.statistics.passRate = Math.round((scores.filter((s: number) => s >= 60).length / scores.length) * 100);
      }
      
      if (timesSpent.length > 0) {
        data.statistics.averageTimeSpent = Math.round(timesSpent.reduce((a: number, b: number) => a + b, 0) / timesSpent.length);
      }
      
      // Sort attempts by score (highest first) and add rank
      data.attempts.sort((a: any, b: any) => b.percentage - a.percentage);
      data.attempts.forEach((attempt: any, index: number) => {
        attempt.rank = index + 1;
      });
      
      return data;
    });
    
    // Sort quizzes by most recent attempt
    quizPerformanceData.sort((a, b) => {
      const aLatest = Math.max(...a.attempts.map((att: any) => new Date(att.createdAt).getTime()));
      const bLatest = Math.max(...b.attempts.map((att: any) => new Date(att.createdAt).getTime()));
      return bLatest - aLatest;
    });
    
    logInfo('Quiz performance data retrieved successfully', { 
      quizCount: quizPerformanceData.length,
      totalAttempts: quizAttempts.length 
    });
    
    res.json({
      success: true,
      data: quizPerformanceData,
      summary: {
        totalQuizzes: quizPerformanceData.length,
        totalAttempts: quizAttempts.length,
        totalUniqueStudents: new Set(quizAttempts.map(a => a.userId)).size
      }
    });
  } catch (error) {
    logError('Error fetching quiz performance data', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch quiz performance data',
      message: 'An error occurred while fetching performance data'
    });
  }
};

export const getStudentPerformance = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    
    const studentAttempts = await QuizAttempt.findAll({
      where: { userId: parseInt(userId) },
      include: [
        {
          model: Quiz,
          as: 'quiz',
          include: [
            {
              model: Category,
              as: 'category',
              attributes: ['id', 'name']
            }
          ],
          attributes: ['id', 'title', 'difficulty', 'categoryId']
        }
      ],
      order: [['createdAt', 'DESC']],
      attributes: ['id', 'quizId', 'status', 'score', 'totalQuestions', 'correctAnswers', 'timeSpent', 'startedAt', 'completedAt', 'createdAt']
    });
    
    const student = await User.findByPk(parseInt(userId), {
      attributes: ['id', 'username', 'email', 'firstName', 'lastName']
    });
    
    if (!student) {
      res.status(404).json({
        success: false,
        error: 'Student not found'
      });
      return;
    }
    
    const performanceData = {
      student: {
        id: student.id,
        username: student.username,
        email: student.email,
        fullName: `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.username
      },
      attempts: studentAttempts.map(attempt => ({
        id: attempt.id,
        quiz: {
          id: attempt.quiz.id,
          title: attempt.quiz.title,
          difficulty: attempt.quiz.difficulty,
          category: attempt.quiz.category
        },
        status: attempt.status,
        score: attempt.score,
        totalQuestions: attempt.totalQuestions,
        correctAnswers: attempt.correctAnswers,
        percentage: attempt.totalQuestions > 0 ? Math.round((attempt.correctAnswers / attempt.totalQuestions) * 100) : 0,
        timeSpent: attempt.timeSpent,
        startedAt: attempt.startedAt,
        completedAt: attempt.completedAt,
        createdAt: attempt.createdAt
      })),
      statistics: {
        totalAttempts: studentAttempts.length,
        completedQuizzes: studentAttempts.filter(a => a.status === 'COMPLETED').length,
        averageScore: 0,
        highestScore: 0,
        lowestScore: null as number | null
      }
    };
    
    // Calculate statistics
    const completedAttempts = performanceData.attempts.filter(a => a.status === 'COMPLETED');
    if (completedAttempts.length > 0) {
      const scores = completedAttempts.map(a => a.percentage);
      performanceData.statistics.averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      performanceData.statistics.highestScore = Math.max(...scores);
      performanceData.statistics.lowestScore = Math.min(...scores);
    }
    
    logInfo('Student performance data retrieved successfully', { userId });
    
    res.json({
      success: true,
      data: performanceData
    });
  } catch (error) {
    logError('Error fetching student performance data', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch student performance data',
      message: 'An error occurred while fetching performance data'
    });
  }
};
