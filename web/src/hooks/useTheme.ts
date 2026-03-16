import { useEffect, useState, useCallback } from 'react';

export type ThemeOption = 'light' | 'dark' | 'system';

interface UseThemeReturn {
  theme: ThemeOption;
  setTheme: (theme: ThemeOption) => void;
  resolvedTheme: 'light' | 'dark';
}

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(theme: ThemeOption): 'light' | 'dark' {
  if (theme === 'system') return getSystemTheme();
  return theme;
}

function applyTheme(resolved: 'light' | 'dark') {
  if (resolved === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

export function useTheme(): UseThemeReturn {
  const stored = (localStorage.getItem('theme') as ThemeOption) || 'system';
  const [theme, setThemeState] = useState<ThemeOption>(stored);
  const resolved = resolveTheme(theme);

  const setTheme = useCallback((newTheme: ThemeOption) => {
    localStorage.setItem('theme', newTheme);
    setThemeState(newTheme);
    applyTheme(resolveTheme(newTheme));
  }, []);

  // Apply on mount
  useEffect(() => {
    applyTheme(resolved);
  }, [resolved]);

  // Listen for OS preference changes when in system mode
  useEffect(() => {
    if (theme !== 'system') return;

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme(getSystemTheme());
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  return { theme, setTheme, resolvedTheme: resolved };
}
