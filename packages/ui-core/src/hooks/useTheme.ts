import { useEffect, useState } from 'react';

export function useTheme() {
  const [themeId, setThemeId] = useState<string>('dark');

  useEffect(() => {
    window.vantare?.getActiveTheme().then((theme: any) => {
      if (theme) setThemeId(theme.id);
    });
  }, []);

  return { themeId };
}
