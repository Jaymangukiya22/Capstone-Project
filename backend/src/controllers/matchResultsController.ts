import { Request, Response } from 'express';
import { Match } from '../models/Match';
import { MatchPlayer } from '../models/MatchPlayer';
import { User } from '../models/User';
import { Quiz } from '../models/Quiz';
import { QuizQuestion } from '../models/QuizQuestion';

/**
 * Get match results from database
 * Fetches actual data instead of relying on unreliable session storage
 */
export const getMatchResults = async (req: Request, res: Response) => {
  try {
    const { matchId } = req.params;

    if (!matchId) {
      return res.status(400).json({
        success: false,
        message: 'Match ID is required'
      });
    }

    // Find match with all related data
    const match = await Match.findOne({
      where: { matchId },
      include: [
        {
          model: MatchPlayer,
          as: 'players',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'username', 'email', 'firstName', 'lastName', 'avatar']
            }
          ]
        },
        {
          model: Quiz,
          as: 'quiz',
          include: [
            {
              model: QuizQuestion,
              as: 'quizQuestions'
            }
          ]
        }
      ]
    });

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    // Get total questions from quiz
    const totalQuestions = match.quiz?.quizQuestions?.length || match.quiz?.maxQuestions || 10;

    // Format player results
    const results = match.players?.map((player: any) => {
      const userData = player.user;
      const correctAnswers = player.correctAnswers || 0;
      const totalAnswers = correctAnswers; // Player's answered questions
      const accuracy = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;

      return {
        userId: player.userId,
        username: userData?.username || userData?.email || 'Unknown',
        firstName: userData?.firstName || '',
        lastName: userData?.lastName || '',
        avatar: userData?.avatar || '',
        score: player.score || 0,
        correctAnswers,
        totalAnswers: totalQuestions, // Use actual quiz length
        totalQuestions, // Add this for consistency
        accuracy,
        timeSpent: player.timeSpent || 0,
        status: player.status
      };
    }).sort((a: any, b: any) => b.score - a.score) || [];

    // Determine winner
    const winner = results[0] || null;

    // Response format matching frontend expectations
    const response = {
      success: true,
      data: {
        matchId: match.matchId,
        quizId: match.quizId,
        quizTitle: match.quiz?.title || 'Friend Match',
        status: match.status,
        type: match.type,
        totalQuestions,
        startedAt: match.startedAt,
        endedAt: match.endedAt,
        results,
        winner,
        isFriendMatch: true
      }
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Error fetching match results:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch match results',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
