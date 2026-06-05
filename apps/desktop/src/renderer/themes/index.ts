import type { Theme } from '@vantare/types';

import _dark from './dark.json';
import _blood from './blood.json';
import _midnight from './midnight.json';

const dark = _dark as Theme;
const blood = _blood as Theme;
const midnight = _midnight as Theme;

export const builtInThemes = [dark, blood, midnight] as const;
export { dark, blood, midnight };
