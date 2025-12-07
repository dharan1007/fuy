import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';

type ThemeMode = 'dark' | 'light' | 'eye-care';

interface ThemeContextType {
    mode: ThemeMode;
    toggleTheme: () => void;
    colors: {
        background: string;
        text: string;
        border: string;
        primary: string;
        secondary: string;
        accent: string;
        card: string;
    };
    isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [mode, setMode] = useState<ThemeMode>('dark');

    const colors = React.useMemo(() => {
        switch (mode) {
            case 'light':
                return {
                    background: '#FFFFFF',
                    text: '#000000',
                    border: '#E5E5E5',
                    primary: '#000000',
                    secondary: '#666666',
                    accent: '#007AFF',
                    card: '#F5F5F5',
                };
            case 'eye-care':
                return {
                    background: '#F5E6D3', // Warm beige / Sepia
                    text: '#433422',      // Dark brown
                    border: '#E6D5C0',
                    primary: '#8B4513',   // Saddle brown
                    secondary: '#6F5B45',
                    accent: '#CD853F',    // Peru
                    card: '#E8DCCA',
                };
            case 'dark':
            default:
                return {
                    background: '#000000',
                    text: '#FFFFFF',
                    border: '#333333',
                    primary: '#FFFFFF',
                    secondary: '#888888',
                    accent: '#FFFFFF',
                    card: '#1A1A1A',
                };
        }
    }, [mode]);

    const toggleTheme = () => {
        setMode(prev => {
            if (prev === 'dark') return 'light';
            if (prev === 'light') return 'eye-care';
            return 'dark';
        });
    };

    const isDark = mode === 'dark';

    return (
        <ThemeContext.Provider value={{ mode, toggleTheme, colors, isDark }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
