export class AuthService {
    static async login(email, password) {
        return { success: false, error: 'Not implemented', user: null };
    }
    static async register(email, password) {
        return { success: false, error: 'Not implemented', user: null };
    }
    static async getLicenseStatus() {
        return { tier: 'free', isValid: true };
    }
}
//# sourceMappingURL=index.js.map