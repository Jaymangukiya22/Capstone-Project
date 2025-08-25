import { prisma } from '@/config/database.config';
import { EloCalculation, NotFoundError } from '@/types/index.types';

export class EloService {
  private readonly K_FACTOR = 32; // Standard K-factor for ELO calculations
  private readonly INITIAL_RATING = 1200; // Starting ELO rating

  /**
   * Calculate new ELO ratings after a match
   */
  calculateEloChange(
    playerRating: number,
    opponentRating: number,
    playerWon: boolean
  ): EloCalculation {
    // Calculate expected scores
    const expectedPlayerScore = this.getExpectedScore(playerRating, opponentRating);
    const expectedOpponentScore = this.getExpectedScore(opponentRating, playerRating);

    // Actual scores (1 for win, 0 for loss)
    const actualPlayerScore = playerWon ? 1 : 0;
    const actualOpponentScore = playerWon ? 0 : 1;

    // Calculate rating changes
    const playerChange = Math.round(this.K_FACTOR * (actualPlayerScore - expectedPlayerScore));
    const opponentChange = Math.round(this.K_FACTOR * (actualOpponentScore - expectedOpponentScore));

    // Calculate new ratings
    const newPlayerRating = Math.max(100, playerRating + playerChange); // Minimum rating of 100
    const newOpponentRating = Math.max(100, opponentRating + opponentChange);

    return {
      newPlayerRating,
      newOpponentRating,
      playerChange,
      opponentChange,
    };
  }

  /**
   * Calculate expected score using ELO formula
   */
  private getExpectedScore(playerRating: number, opponentRating: number): number {
    return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  }

  /**
   * Update ELO ratings after a match
   */
  async updateRatingsAfterMatch(
    playerId: string,
    opponentId: string,
    courseId: string,
    playerWon: boolean
  ): Promise<{
    playerRating: { old: number; new: number; change: number };
    opponentRating: { old: number; new: number; change: number };
  }> {
    // Get current ratings
    const [playerElo, opponentElo] = await Promise.all([
      this.getOrCreateEloRating(playerId, courseId),
      this.getOrCreateEloRating(opponentId, courseId),
    ]);

    // Calculate new ratings
    const eloCalculation = this.calculateEloChange(
      playerElo.rating,
      opponentElo.rating,
      playerWon
    );

    // Update ratings in database
    await prisma.$transaction([
      prisma.eloRating.update({
        where: { id: playerElo.id },
        data: {
          rating: eloCalculation.newPlayerRating,
          matches: { increment: 1 },
          wins: playerWon ? { increment: 1 } : undefined,
          losses: !playerWon ? { increment: 1 } : undefined,
        },
      }),
      prisma.eloRating.update({
        where: { id: opponentElo.id },
        data: {
          rating: eloCalculation.newOpponentRating,
          matches: { increment: 1 },
          wins: !playerWon ? { increment: 1 } : undefined,
          losses: playerWon ? { increment: 1 } : undefined,
        },
      }),
    ]);

    return {
      playerRating: {
        old: playerElo.rating,
        new: eloCalculation.newPlayerRating,
        change: eloCalculation.playerChange,
      },
      opponentRating: {
        old: opponentElo.rating,
        new: eloCalculation.newOpponentRating,
        change: eloCalculation.opponentChange,
      },
    };
  }

  /**
   * Get or create ELO rating for a user in a course
   */
  async getOrCreateEloRating(userId: string, courseId: string) {
    let eloRating = await prisma.eloRating.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    if (!eloRating) {
      eloRating = await prisma.eloRating.create({
        data: {
          userId,
          courseId,
          rating: this.INITIAL_RATING,
        },
      });
    }

    return eloRating;
  }

  /**
   * Get user's ELO rating for a specific course
   */
  async getUserRating(userId: string, courseId: string) {
    const eloRating = await this.getOrCreateEloRating(userId, courseId);
    return eloRating;
  }

  /**
   * Get user's ratings across all courses
   */
  async getUserRatings(userId: string) {
    const ratings = await prisma.eloRating.findMany({
      where: { userId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            code: true,
          },
        },
      },
      orderBy: { rating: 'desc' },
    });

    return ratings;
  }

  /**
   * Get course leaderboard
   */
  async getCourseLeaderboard(courseId: string, limit: number = 50) {
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
          },
        },
      },
      orderBy: [
        { rating: 'desc' },
        { wins: 'desc' },
        { matches: 'asc' }, // Fewer matches as tiebreaker
      ],
      take: limit,
    });

    return leaderboard.map((entry, index) => ({
      rank: index + 1,
      user: entry.user,
      rating: entry.rating,
      matches: entry.matches,
      wins: entry.wins,
      losses: entry.losses,
      winRate: entry.matches > 0 ? Math.round((entry.wins / entry.matches) * 100) : 0,
    }));
  }

  /**
   * Get global leaderboard across all courses
   */
  async getGlobalLeaderboard(limit: number = 50) {
    // Calculate average rating per user across all courses
    const userRatings = await prisma.eloRating.groupBy({
      by: ['userId'],
      _avg: {
        rating: true,
      },
      _sum: {
        matches: true,
        wins: true,
        losses: true,
      },
      _count: {
        courseId: true, // Number of courses participated in
      },
      orderBy: {
        _avg: {
          rating: 'desc',
        },
      },
      take: limit,
    });

    // Get user details
    const userIds = userRatings.map(ur => ur.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
      },
    });

    const userMap = new Map(users.map(user => [user.id, user]));

    return userRatings.map((rating, index) => {
      const user = userMap.get(rating.userId);
      const totalMatches = rating._sum.matches || 0;
      const totalWins = rating._sum.wins || 0;

      return {
        rank: index + 1,
        user,
        averageRating: Math.round(rating._avg.rating || this.INITIAL_RATING),
        coursesParticipated: rating._count.courseId,
        totalMatches,
        totalWins,
        totalLosses: rating._sum.losses || 0,
        winRate: totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0,
      };
    });
  }

  /**
   * Find suitable opponent for matchmaking
   */
  async findSuitableOpponent(
    userId: string,
    courseId: string,
    ratingRange: number = 200
  ): Promise<string | null> {
    const userRating = await this.getUserRating(userId, courseId);
    
    const minRating = userRating.rating - ratingRange;
    const maxRating = userRating.rating + ratingRange;

    // Find users within rating range, excluding the current user
    const potentialOpponents = await prisma.eloRating.findMany({
      where: {
        courseId,
        userId: { not: userId },
        rating: {
          gte: minRating,
          lte: maxRating,
        },
      },
      include: {
        user: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        rating: 'desc',
      },
      take: 10, // Limit to top 10 candidates
    });

    if (potentialOpponents.length === 0) {
      return null;
    }

    // Return a random opponent from the candidates
    const randomIndex = Math.floor(Math.random() * potentialOpponents.length);
    return potentialOpponents[randomIndex].userId;
  }

  /**
   * Get rating statistics for a course
   */
  async getCourseRatingStats(courseId: string) {
    const stats = await prisma.eloRating.aggregate({
      where: { courseId },
      _avg: { rating: true },
      _min: { rating: true },
      _max: { rating: true },
      _count: { userId: true },
    });

    const ratingDistribution = await prisma.eloRating.groupBy({
      where: { courseId },
      by: ['rating'],
      _count: { userId: true },
    });

    // Create rating brackets
    const brackets = {
      beginner: 0,    // < 1000
      novice: 0,      // 1000-1199
      intermediate: 0, // 1200-1399
      advanced: 0,    // 1400-1599
      expert: 0,      // 1600-1799
      master: 0,      // >= 1800
    };

    ratingDistribution.forEach(item => {
      const rating = item.rating;
      const count = item._count.userId;

      if (rating < 1000) brackets.beginner += count;
      else if (rating < 1200) brackets.novice += count;
      else if (rating < 1400) brackets.intermediate += count;
      else if (rating < 1600) brackets.advanced += count;
      else if (rating < 1800) brackets.expert += count;
      else brackets.master += count;
    });

    return {
      totalPlayers: stats._count.userId,
      averageRating: Math.round(stats._avg.rating || this.INITIAL_RATING),
      minRating: stats._min.rating || this.INITIAL_RATING,
      maxRating: stats._max.rating || this.INITIAL_RATING,
      ratingBrackets: brackets,
    };
  }

  /**
   * Reset user's rating in a course (Admin only)
   */
  async resetUserRating(userId: string, courseId: string) {
    const eloRating = await prisma.eloRating.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    if (!eloRating) {
      throw new NotFoundError('User rating not found for this course');
    }

    const resetRating = await prisma.eloRating.update({
      where: { id: eloRating.id },
      data: {
        rating: this.INITIAL_RATING,
        matches: 0,
        wins: 0,
        losses: 0,
      },
    });

    return resetRating;
  }

  /**
   * Get user's rating history (if we implement rating history tracking)
   */
  async getUserRatingHistory(userId: string, courseId: string) {
    // This would require a separate RatingHistory table to track changes over time
    // For now, we'll return the current rating
    const currentRating = await this.getUserRating(userId, courseId);
    
    return {
      currentRating: currentRating.rating,
      matches: currentRating.matches,
      wins: currentRating.wins,
      losses: currentRating.losses,
      // history: [] // Would contain historical rating changes
    };
  }
}
