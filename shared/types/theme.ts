export interface Theme {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  tokens: Record<string, string>;
  overlayOverrides?: Record<string, Record<string, string>>;
}
