import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
export declare const getAIOpponents: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const createSoloMatch: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const createMultiplayerMatch: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const joinMatch: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const getMatch: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const getAvailableMatches: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const getMatchHistory: (req: AuthenticatedRequest, res: Response) => Promise<void>;
//# sourceMappingURL=matchController.d.ts.map