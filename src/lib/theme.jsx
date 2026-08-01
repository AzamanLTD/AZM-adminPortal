import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const ThemeCtx = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('az-dark-mode');
      return saved !== null ? (JSON.parse(saved) ? 'dark' : 'light') : 'light';
    } catch { return 'light'; }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    try { localStorage.setItem('az-dark-mode', JSON.stringify(theme === 'dark')); } catch {}
  }, [theme]);

  const toggle = useCallback(() => setTheme(t => t === 'dark' ? 'light' : 'dark'), []);
  const setVertical = useCallback(v => {
    if (v) document.documentElement.setAttribute('data-vertical', v);
    else document.documentElement.removeAttribute('data-vertical');
  }, []);

  return (
    <ThemeCtx.Provider value={{ theme, toggle, setVertical }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export const useTheme = () => useContext(ThemeCtx);
