import React, { createContext, useContext, useEffect, useState } from 'react';
import { Theme } from '../types';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

const themeConfigs = {
    [Theme.ELITE]: {
        '--color-primary': '#0f172a',
        '--color-secondary': '#334155',
        '--color-accent': '#0ea5e9',
        '--color-success': '#10b981',
        '--color-warning': '#f59e0b',
        '--color-danger': '#ef4444',
        '--color-bg-root': '#f1f5f9',
        '--color-bg-surface': '#ffffff',
        '--color-text-main': '#0f172a',
        '--color-text-dim': '#64748b',
        '--color-border-main': '#e2e8f0',
    },
    [Theme.MIDNIGHT]: {
        '--color-primary': '#09090b',
        '--color-secondary': '#18181b',
        '--color-accent': '#3b82f6', // Premium Blue instead of Orange
        '--color-success': '#10b981',
        '--color-warning': '#3b82f6',
        '--color-danger': '#ef4444',
        '--color-bg-root': '#020617', // Deeper blue base
        '--color-bg-surface': '#0f172a', // Slate 900 surface
        '--color-text-main': '#f8fafc',
        '--color-text-dim': '#94a3b8',
        '--color-border-main': '#1e293b',
    },
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setThemeState] = useState<Theme>(() => {
        const saved = localStorage.getItem('app_theme');
        if (saved === 'CLEAN_WHITE') return Theme.ELITE;
        return (saved as Theme) || Theme.ELITE;
    });

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
        localStorage.setItem('app_theme', newTheme);
    };

    useEffect(() => {
        const config = themeConfigs[theme];
        const root = document.documentElement;

        Object.entries(config).forEach(([property, value]) => {
            root.style.setProperty(property, value as string);
        });

        // Handle body class for dark mode detection if needed by Tailwind or other libs
        if (theme === Theme.MIDNIGHT) {
            document.body.classList.add('dark');
        } else {
            document.body.classList.remove('dark');
        }

        // Update theme-color meta tag
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', config['--color-primary']);
        }
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
