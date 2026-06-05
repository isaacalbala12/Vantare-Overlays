export declare class AuthService {
    static login(email: string, password: string): Promise<AuthResult>;
    static register(email: string, password: string): Promise<AuthResult>;
    static getLicenseStatus(): Promise<LicenseStatus>;
}
export interface AuthResult {
    success: boolean;
    error?: string;
    user: AuthUser | null;
}
export interface AuthUser {
    id: string;
    email: string;
}
export interface LicenseStatus {
    tier: 'free' | 'pro' | 'ultimate';
    isValid: boolean;
    expiresAt?: string;
}
//# sourceMappingURL=index.d.ts.map