import React, { createContext, useContext, useState, useEffect } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastOptions {
    title?: string;
    description: string;
    type?: ToastType;
    duration?: number;
}

interface Toast extends ToastOptions {
    id: string;
}

interface ToastContextType {
    addToast: (options: ToastOptions) => void;
    showToast: (description: string, type?: ToastType, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = ({ title, description, type = 'info', duration = 5000 }: ToastOptions) => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts((prev) => [...prev, { id, title, description, type }]);

        setTimeout(() => {
            setToasts((prev) => prev.filter((toast) => toast.id !== id));
        }, duration);
    };

    const showToast = (description: string, type: ToastType = 'info', title?: string) => {
        addToast({ description, type, title });
    };

    return (
        <ToastContext.Provider value={{ addToast, showToast }}>
            {children}
            <div className="fixed bottom-5 right-5 z-[200] flex flex-col gap-3 pointer-events-none">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`
                            px-6 py-4 rounded-xl shadow-2xl backdrop-blur-md border border-white/10 text-white
                            transform transition-all duration-300 animate-in slide-in-from-right-10 fade-in
                            flex items-start gap-4 min-w-[320px] pointer-events-auto
                            ${toast.type === 'success' ? 'bg-emerald-600/95 shadow-emerald-900/40' :
                                toast.type === 'error' ? 'bg-red-600/95 shadow-red-900/40' :
                                    toast.type === 'warning' ? 'bg-amber-600/95 shadow-amber-900/40' :
                                        'bg-blue-600/95 shadow-blue-900/40'}
                        `}
                    >
                        <span className="material-icons-round text-2xl mt-0.5">
                            {toast.type === 'success' ? 'check_circle' :
                                toast.type === 'error' ? 'error' :
                                    toast.type === 'warning' ? 'warning' :
                                        'info'}
                        </span>
                        <div>
                            {toast.title && <h4 className="font-bold text-sm mb-0.5">{toast.title}</h4>}
                            <p className="text-sm font-medium opacity-90 leading-snug">{toast.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
