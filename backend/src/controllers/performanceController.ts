import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { logError, logInfo } from '../utils/logger';
import { QuizAttempt } from '../models/QuizAttempt';
import { Quiz } from '../models/Quiz';
import { User } from '../models/User';
import { Category } from '../models/Category';
import { Match } from '../models/Match';
import { MatchPlayer } from '../models/MatchPlayer';
import { MatchType } from '../types/enums';
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

export const getMyMatchHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }
    
    // Fetch friend matches where this user participated
    const userMatches = await MatchPlayer.findAll({
      where: { userId },
      include: [
        {
          model: Match,
          as: 'match',
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
              attributes: ['id', 'title', 'difficulty', 'timeLimit']
            },
            {
              model: MatchPlayer,
              as: 'players',
              include: [
                {
                  model: User,
                  as: 'user',
                  attributes: ['id', 'username', 'email', 'firstName', 'lastName']
                }
              ],
              attributes: ['id', 'userId', 'score', 'correctAnswers', 'timeSpent', 'status']
            }
          ],
          attributes: ['id', 'matchId', 'type', 'status', 'startedAt', 'endedAt', 'winnerId', 'createdAt']
        }
      ],
      order: [['createdAt', 'DESC']],
      attributes: ['id', 'score', 'correctAnswers', 'timeSpent', 'status', 'createdAt']
    });
    
    // Format match history
    const matchHistory = userMatches
      .filter(um => um.match && um.match.type === MatchType.FRIEND_MATCH) // Only friend matches
      .map(userMatch => {
        const match = userMatch.match;
        const players = match.players || [];
        const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
        
        // Find opponent (the other player)
        const opponent = players.find(p => p.userId !== userId);
        
        // Determine if user won
        const userRank = sortedPlayers.findIndex(p => p.userId === userId) + 1;
        const isWinner = match.winnerId === userId;
        
        return {
          matchId: match.matchId,
          quiz: match.quiz ? {
            id: match.quiz.id,
            title: match.quiz.title,
            difficulty: match.quiz.difficulty,
            category: match.quiz.category
          } : null,
          myStats: {
            score: userMatch.score,
            correctAnswers: userMatch.correctAnswers,
            timeSpent: userMatch.timeSpent,
            rank: userRank,
            isWinner
          },
          opponent: opponent ? {
            username: opponent.user.username,
            score: opponent.score,
            correctAnswers: opponent.correctAnswers
          } : null,
          result: isWinner ? 'WON' : (match.winnerId ? 'LOST' : 'TIE'),
          scoreDifference: opponent ? userMatch.score - opponent.score : 0,
          status: match.status,
          playedAt: match.createdAt,
          completedAt: match.endedAt
        };
      });
    
    // Calculate statistics
    const completedMatches = matchHistory.filter(m => m.status === 'COMPLETED');
    const wins = completedMatches.filter(m => m.result === 'WON').length;
    const losses = completedMatches.filter(m => m.result === 'LOST').length;
    const ties = completedMatches.filter(m => m.result === 'TIE').length;
    
    const statistics = {
      totalMatches: matchHistory.length,
      completedMatches: completedMatches.length,
      wins,
      losses,
      ties,
      winRate: completedMatches.length > 0 ? Math.round((wins / completedMatches.length) * 100) : 0,
      averageScore: completedMatches.length > 0 ?
        Math.round(completedMatches.reduce((sum, m) => sum + m.myStats.score, 0) / completedMatches.length) : 0,
      highestScore: completedMatches.length > 0 ?
        Math.max(...completedMatches.map(m => m.myStats.score)) : 0
    };
    
    logInfo('Player match history retrieved successfully', { 
      userId,
      matchCount: matchHistory.length 
    });
    
    res.json({
      success: true,
      data: {
        matches: matchHistory,
        statistics
      }
    });
  } catch (error) {
    logError('Error fetching player match history', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch match history',
      message: 'An error occurred while fetching your match history'
    });
  }
};

export const getCombinedQuizPerformance = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { quizId, startDate, endDate, categoryId } = req.query;
    
    // Build where clauses for filtering
    const whereClause: any = {};
    const quizWhereClause: any = {};
    const matchWhereClause: any = {
      type: MatchType.FRIEND_MATCH
    };
    
    if (quizId) {
      whereClause.quizId = parseInt(quizId as string);
      matchWhereClause.quizId = parseInt(quizId as string);
    }
    
    if (startDate && endDate) {
      whereClause.createdAt = {
        [Op.between]: [new Date(startDate as string), new Date(endDate as string)]
      };
      matchWhereClause.createdAt = {
        [Op.between]: [new Date(startDate as string), new Date(endDate as string)]
      };
    }
    
    if (categoryId) {
      quizWhereClause.categoryId = parseInt(categoryId as string);
    }
    
    // Fetch Solo VS AI attempts
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
    
    // Fetch Friend Matches
    const friendMatches = await Match.findAll({
      where: matchWhereClause,
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
          model: MatchPlayer,
          as: 'players',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'username', 'email', 'firstName', 'lastName']
            }
          ],
          attributes: ['id', 'userId', 'score', 'correctAnswers', 'timeSpent', 'joinedAt', 'finishedAt', 'status']
        }
      ],
      order: [['createdAt', 'DESC']],
      attributes: ['id', 'matchId', 'quizId', 'type', 'status', 'startedAt', 'endedAt', 'winnerId', 'createdAt']
    });
    
    // Group by quiz
    const quizPerformanceMap = new Map();
    
    // Add Solo VS AI attempts
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
            soloAttempts: 0,
            friendMatches: 0,
            completedAttempts: 0,
            averageScore: 0,
            highestScore: 0,
            lowestScore: null as number | null,
            averageTimeSpent: 0,
            passRate: 0
          }
        });
      }
      
      const performanceData = quizPerformanceMap.get(quizId);
      
      performanceData.attempts.push({
        id: attempt.id,
        type: 'SOLO_VS_AI',
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
    
    // Add Friend Matches
    friendMatches.forEach(match => {
      // Skip matches without quiz data
      if (!match.quiz) {
        return;
      }
      
      const quizId = match.quizId;
      
      if (!quizPerformanceMap.has(quizId)) {
        quizPerformanceMap.set(quizId, {
          quiz: {
            id: match.quiz.id,
            title: match.quiz.title,
            description: match.quiz.description,
            difficulty: match.quiz.difficulty,
            timeLimit: match.quiz.timeLimit,
            category: match.quiz.category
          },
          attempts: [],
          statistics: {
            totalAttempts: 0,
            soloAttempts: 0,
            friendMatches: 0,
            completedAttempts: 0,
            averageScore: 0,
            highestScore: 0,
            lowestScore: null as number | null,
            averageTimeSpent: 0,
            passRate: 0
          }
        });
      }
      
      const performanceData = quizPerformanceMap.get(quizId);
      
      // Add each player as a separate attempt
      match.players?.forEach(player => {
        const totalQuestions = 10; // Friend matches have 10 questions
        performanceData.attempts.push({
          id: `match-${match.id}-player-${player.id}`,
          type: 'PLAY_WITH_FRIEND',
          matchId: match.matchId,
          user: {
            id: player.user.id,
            username: player.user.username,
            email: player.user.email,
            fullName: `${player.user.firstName || ''} ${player.user.lastName || ''}`.trim() || player.user.username
          },
          status: match.status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS',
          score: player.score || 0,
          totalQuestions,
          correctAnswers: player.correctAnswers || 0,
          percentage: totalQuestions > 0 ? Math.round(((player.correctAnswers || 0) / totalQuestions) * 100) : 0,
          timeSpent: player.timeSpent || 0,
          startedAt: match.startedAt,
          completedAt: match.endedAt,
          createdAt: match.createdAt,
          isWinner: match.winnerId === player.userId
        });
      });
    });
    
    // Calculate statistics for each quiz
    const quizPerformanceData = Array.from(quizPerformanceMap.values()).map(data => {
      const completedAttempts = data.attempts.filter((a: any) => a.status === 'COMPLETED');
      const scores = completedAttempts.map((a: any) => a.percentage);
      const timesSpent = completedAttempts.filter((a: any) => a.timeSpent).map((a: any) => a.timeSpent);
      
      data.statistics.totalAttempts = data.attempts.length;
      data.statistics.soloAttempts = data.attempts.filter((a: any) => a.type === 'SOLO_VS_AI').length;
      data.statistics.friendMatches = data.attempts.filter((a: any) => a.type === 'PLAY_WITH_FRIEND').length;
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
    
    const totalAttempts = quizAttempts.length + friendMatches.reduce((sum, m) => sum + (m.players?.length || 0), 0);
    const uniqueStudents = new Set([
      ...quizAttempts.map(a => a.userId),
      ...friendMatches.flatMap(m => m.players?.map(p => p.userId) || [])
    ]);
    
    logInfo('Combined quiz performance data retrieved successfully', { 
      quizCount: quizPerformanceData.length,
      totalAttempts,
      soloAttempts: quizAttempts.length,
      friendMatches: friendMatches.length
    });
    
    res.json({
      success: true,
      data: quizPerformanceData,
      summary: {
        totalQuizzes: quizPerformanceData.length,
        totalAttempts,
        soloAttempts: quizAttempts.length,
        friendMatches: friendMatches.length,
        totalUniqueStudents: uniqueStudents.size
      }
    });
  } catch (error) {
    logError('Error fetching combined quiz performance data', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch quiz performance data',
      message: 'An error occurred while fetching performance data'
    });
  }
};

export const getFriendMatchHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { quizId, startDate, endDate, status } = req.query;
    
    // Build where clause for filtering
    const matchWhereClause: any = {
      type: MatchType.FRIEND_MATCH // Only friend matches
    };
    
    if (quizId) {
      matchWhereClause.quizId = parseInt(quizId as string);
    }
    
    if (startDate && endDate) {
      matchWhereClause.createdAt = {
        [Op.between]: [new Date(startDate as string), new Date(endDate as string)]
      };
    }
    
    if (status) {
      matchWhereClause.status = status;
    }
    
    // Fetch friend matches with player data
    const matches = await Match.findAll({
      where: matchWhereClause,
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
          attributes: ['id', 'title', 'description', 'difficulty', 'timeLimit', 'categoryId']
        },
        {
          model: MatchPlayer,
          as: 'players',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'username', 'email', 'firstName', 'lastName']
            }
          ],
          attributes: ['id', 'userId', 'score', 'correctAnswers', 'timeSpent', 'joinedAt', 'finishedAt', 'status']
        }
      ],
      order: [['createdAt', 'DESC']],
      attributes: ['id', 'matchId', 'quizId', 'type', 'status', 'maxPlayers', 'startedAt', 'endedAt', 'winnerId', 'createdAt']
    });
    
    // Format match data
    const formattedMatches = matches.map(match => {
      const players = match.players || [];
      const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
      
      return {
        match: {
          id: match.id,
          matchId: match.matchId,
          quiz: match.quiz ? {
            id: match.quiz.id,
            title: match.quiz.title,
            difficulty: match.quiz.difficulty,
            timeLimit: match.quiz.timeLimit,
            category: match.quiz.category
          } : null,
          status: match.status,
          startedAt: match.startedAt,
          endedAt: match.endedAt,
          createdAt: match.createdAt,
          duration: match.startedAt && match.endedAt ? 
            Math.floor((new Date(match.endedAt).getTime() - new Date(match.startedAt).getTime()) / 1000) : null
        },
        players: sortedPlayers.map((player, index) => ({
          rank: index + 1,
          user: {
            id: player.user.id,
            username: player.user.username,
            email: player.user.email,
            fullName: `${player.user.firstName || ''} ${player.user.lastName || ''}`.trim() || player.user.username
          },
          score: player.score,
          correctAnswers: player.correctAnswers,
          timeSpent: player.timeSpent,
          isWinner: match.winnerId === player.userId,
          status: player.status,
          joinedAt: player.joinedAt,
          finishedAt: player.finishedAt
        })),
        statistics: {
          totalPlayers: players.length,
          highestScore: sortedPlayers.length > 0 ? sortedPlayers[0].score : 0,
          averageScore: players.length > 0 ? 
            Math.round(players.reduce((sum, p) => sum + p.score, 0) / players.length) : 0,
          averageTimeSpent: players.length > 0 && players.some(p => p.timeSpent) ?
            Math.round(players.filter(p => p.timeSpent).reduce((sum, p) => sum + (p.timeSpent || 0), 0) / players.filter(p => p.timeSpent).length) : 0
        }
      };
    });
    
    logInfo('Friend match history retrieved successfully', { 
      matchCount: matches.length 
    });
    
    res.json({
      success: true,
      data: formattedMatches,
      summary: {
        totalMatches: matches.length,
        completedMatches: matches.filter(m => m.status === 'COMPLETED').length,
        activeMatches: matches.filter(m => m.status === 'IN_PROGRESS').length,
        totalPlayers: new Set(matches.flatMap(m => m.players?.map(p => p.userId) || [])).size
      }
    });
  } catch (error) {
    logError('Error fetching friend match history', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch friend match history',
      message: 'An error occurred while fetching match history'
    });
  }
};
