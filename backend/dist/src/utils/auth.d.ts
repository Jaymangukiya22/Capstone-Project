export declare enum UserRole {
    ADMIN = "ADMIN",
    PLAYER = "PLAYER"
}
export interface TokenPayload {
    userId: number;
    username: string;
    email: string;
    role: UserRole;
}
export declare const hashPassword: (password: string) => Promise<string>;
export declare const comparePassword: (password: string, hashedPassword: string) => Promise<boolean>;
export declare const generateToken: (payload: TokenPayload) => string;
export declare const generateRefreshToken: (userId: number) => string;
export declare const verifyRefreshToken: (token: string) => {
    userId: number;
};
//# sourceMappingURL=auth.d.ts.map