export type LicenseTier = 'free' | 'pro' | 'ultimate';

export interface AuthUser {
  id: string;
  email: string;
  tier: LicenseTier;
}

export interface AuthResult {
  success: boolean;
  error?: string;
  user: AuthUser | null;
}

export interface LicenseStatus {
  tier: LicenseTier;
  isValid: boolean;
  expiresAt?: string;
}

interface RegisteredUser {
  email: string;
  password: string;
  tier: LicenseTier;
}

export class AuthService {
  private static currentUser: AuthUser | null = null;
  private static users: Map<string, RegisteredUser> = new Map();
  private static currentLicense: LicenseStatus = { tier: 'free', isValid: true };

  static async login(email: string, password: string): Promise<AuthResult> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = this.users.get(normalizedEmail);

    if (!user) {
      return { success: false, error: 'Invalid email or password', user: null };
    }

    if (user.password !== password) {
      return { success: false, error: 'Invalid email or password', user: null };
    }

    this.currentUser = { id: crypto.randomUUID(), email: user.email, tier: user.tier };
    this.currentLicense = { tier: user.tier, isValid: true };

    return { success: true, user: this.currentUser };
  }

  static async register(email: string, password: string, tier: LicenseTier = 'free'): Promise<AuthResult> {
    const normalizedEmail = email.toLowerCase().trim();

    if (!email || !password) {
      return { success: false, error: 'Email and password are required', user: null };
    }

    if (this.users.has(normalizedEmail)) {
      return { success: false, error: 'Email already registered', user: null };
    }

    this.users.set(normalizedEmail, { email: normalizedEmail, password, tier });
    this.currentUser = { id: crypto.randomUUID(), email: normalizedEmail, tier };
    this.currentLicense = { tier, isValid: true };

    return { success: true, user: this.currentUser };
  }

  static async logout(): Promise<void> {
    this.currentUser = null;
    this.currentLicense = { tier: 'free', isValid: true };
  }

  static async getSession(): Promise<AuthUser | null> {
    return this.currentUser;
  }

  static async getLicenseStatus(): Promise<LicenseStatus> {
    return { ...this.currentLicense };
  }

  static canAccess(feature: 'pro-features' | 'ultimate-features'): boolean {
    const tier = this.currentLicense.tier;
    if (feature === 'pro-features') return tier === 'pro' || tier === 'ultimate';
    if (feature === 'ultimate-features') return tier === 'ultimate';
    return false;
  }
}