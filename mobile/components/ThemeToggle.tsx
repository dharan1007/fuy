import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, Eye } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ThemeToggle() {
    const { mode, toggleTheme, colors } = useTheme();
    const insets = useSafeAreaInsets();

    const Icon = () => {
        switch (mode) {
            case 'light': return <Sun color={colors.text} size={20} />;
            case 'eye-care': return <Eye color={colors.text} size={20} />;
            case 'dark': default: return <Moon color={colors.text} size={20} />;
        }
    };

    return (
        <TouchableOpacity
            onPress={toggleTheme}
            className="absolute right-4 rounded-full overflow-hidden shadow-lg"
            style={{
                top: Math.max(insets.top, 20) + 10,
                zIndex: 9999,
                elevation: 10,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
            }}
        >
            <BlurView intensity={20} tint={mode === 'light' ? 'light' : 'dark'} className="p-3">
                <Icon />
            </BlurView>
        </TouchableOpacity>
    );
}
