import React, { createContext, useContext, useState, useCallback } from 'react';
import CustomToast, { ToastType } from '../components/CustomToast';

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toast, setToast] = useState<{ message: string; type: ToastType; id: number } | null>(null);

    const showToast = useCallback((message: string, type: ToastType = 'success') => {
        const id = Date.now();
        setToast({ message, type, id });

        // Auto hide after 3 seconds
        setTimeout(() => {
            setToast(prev => prev?.id === id ? null : prev);
        }, 3000);
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {toast && <CustomToast message={toast.message} type={toast.type} onHide={() => setToast(null)} />}
        </ToastContext.Provider>
    );
}

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within a ToastProvider');
    return context;
};
