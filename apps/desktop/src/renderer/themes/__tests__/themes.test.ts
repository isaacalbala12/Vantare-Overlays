import { describe, it, expect } from 'vitest';
import dark from '../dark.json';
import blood from '../blood.json';
import midnight from '../midnight.json';

const requiredRootKeys = ['id', 'name', 'description', 'author', 'version', 'tokens'] as const;

const requiredTokens = [
  'bg-primary',
  'bg-secondary',
  'bg-surface',
  'bg-elevated',
  'text-primary',
  'text-secondary',
  'text-muted',
  'text-inverse',
  'accent-primary',
  'accent-secondary',
  'accent-success',
  'accent-warning',
  'accent-danger',
  'accent-info',
  'border-default',
  'border-hover',
  'border-accent',
  'radius-sm',
  'radius-md',
  'radius-lg',
  'radius-full',
  'shadow-sm',
  'shadow-md',
  'shadow-lg',
  'font-family',
  'font-size-sm',
  'font-size-md',
  'font-size-lg',
  'font-size-xl',
  'opacity-glass',
  'opacity-disabled',
  'spacing-xs',
  'spacing-sm',
  'spacing-md',
  'spacing-lg',
  'animation-fast',
  'animation-normal',
  'animation-slow',
  'standings-header-bg',
  'standings-row-even',
  'standings-row-odd',
  'delta-positive',
  'delta-negative',
  'delta-neutral',
];

const themes = [dark, blood, midnight] as const;
const themeNames = ['dark', 'blood', 'midnight'] as const;

describe('Built-in Themes', () => {
  describe.each(themeNames)('%s', (name) => {
    const theme = themes[themeNames.indexOf(name as typeof themeNames[number])];

    it('has valid Theme structure', () => {
      for (const key of requiredRootKeys) {
        expect(theme).toHaveProperty(key);
      }
      expect(typeof theme.id).toBe('string');
      expect(typeof theme.name).toBe('string');
      expect(typeof theme.description).toBe('string');
      expect(typeof theme.author).toBe('string');
      expect(typeof theme.version).toBe('string');
      expect(theme.tokens).toBeDefined();
      expect(typeof theme.tokens).toBe('object');
    });

    it('has at least 30 tokens', () => {
      const tokenCount = Object.keys(theme.tokens).length;
      expect(tokenCount).toBeGreaterThanOrEqual(30);
    });

    it('contains all required tokens', () => {
      for (const token of requiredTokens) {
        expect(theme.tokens).toHaveProperty(token);
      }
    });

    it('has non-empty token values', () => {
      for (const [key, value] of Object.entries(theme.tokens)) {
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
      }
    });

    it('has valid color hex values for color tokens', () => {
      const colorTokens = [
        'bg-primary', 'bg-secondary', 'bg-surface', 'bg-elevated',
        'text-primary', 'text-secondary', 'accent-primary', 'accent-secondary',
        'standings-header-bg', 'standings-row-even', 'standings-row-odd',
        'delta-positive', 'delta-negative', 'delta-neutral',
        'border-accent',
      ];
      const tokens = theme.tokens as Record<string, string>;
      for (const token of colorTokens) {
        const value = tokens[token];
        expect(value).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    });

    it('has valid CSS size values for spacing tokens', () => {
      const tokens = theme.tokens as Record<string, string>;
      const spacingTokens = ['spacing-xs', 'spacing-sm', 'spacing-md', 'spacing-lg'];
      for (const token of spacingTokens) {
        expect(tokens[token]).toMatch(/^\d+(\.\d+)?(rem|px|em)$/);
      }
    });

    it('has valid CSS duration values for animation tokens', () => {
      const tokens = theme.tokens as Record<string, string>;
      const animationTokens = ['animation-fast', 'animation-normal', 'animation-slow'];
      for (const token of animationTokens) {
        expect(tokens[token]).toMatch(/^\d+(ms)$/);
      }
    });

    it('has valid version format', () => {
      expect(theme.version).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });
});
