import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';

type ThemeMode = 'default' | 'eye-protection';

interface ThemeContextType {
    mode: ThemeMode;
    toggleMode: () => void;
    colors: {
        background: string;
        text: string;
        border: string;
        primary: string;
        secondary: string;
        accent: string;
    };
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [mode, setMode] = useState<ThemeMode>('default');

    const colors = mode === 'default' ? {
        background: '#000000',
        text: '#FFFFFF',
        border: '#333333',
        primary: '#FFFFFF',
        secondary: '#888888',
        accent: '#FFFFFF',
    } : {
        background: '#1A1A1A', // Softer black/dark gray for eye protection
        text: '#E0E0E0', // Softer white
        border: '#404040',
        primary: '#E0E0E0',
        secondary: '#A0A0A0',
        accent: '#FFD700', // Warm accent for eye protection (optional, or keep white)
    };

    const toggleMode = () => {
        setMode(prev => prev === 'default' ? 'eye-protection' : 'default');
    };

    return (
        <ThemeContext.Provider value={{ mode, toggleMode, colors }}>
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
