import { AuthService as VantareAuth } from '@vantare/auth';

export class AuthService {
  async init(): Promise<void> {
    // Supabase init will go here in Sprint 6
  }

  static async login(email: string, password: string) {
    return VantareAuth.login(email, password);
  }

  static async register(email: string, password: string) {
    return VantareAuth.register(email, password);
  }
}