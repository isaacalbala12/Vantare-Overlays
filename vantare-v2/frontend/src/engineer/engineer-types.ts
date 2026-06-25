export type EngineerNotification = {
  id: string;
  category: string;
  severity: string;
  textKey: string;
  text: string;
  priority: number;
  createdAt: number;
  expiresAt?: number;
  source: string;
};

export type EngineerStatus = {
  enabled: boolean;
  connected: boolean;
  source: string;
  spotterEnabled: boolean;
  sensitivity: string;
  ttsCacheCount: number;
  recentMessages: EngineerNotification[];
  lastError?: string;
};
