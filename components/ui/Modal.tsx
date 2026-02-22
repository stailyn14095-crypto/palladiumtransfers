import React, { useEffect, useState } from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm?: () => void;
    title: string;
    message?: string;
    children?: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    type?: 'info' | 'danger' | 'success';
}

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    children,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    type = 'info'
}) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setVisible(true);
            document.body.style.overflow = 'hidden';
        } else {
            const timer = setTimeout(() => setVisible(false), 300);
            document.body.style.overflow = '';
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!visible) return null;

    return (
        <div className={`fixed inset-0 z-[150] flex items-center justify-center p-4 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className={`relative bg-[#1a2533] border border-white/10 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all duration-300 ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
                {/* Header */}
                <div className={`p-6 border-b border-white/5 flex items-center justify-between ${type === 'danger' ? 'bg-red-500/10' : 'bg-white/5'}`}>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        {type === 'danger' && <span className="material-icons-round text-red-500">warning</span>}
                        {type === 'success' && <span className="material-icons-round text-emerald-500">check_circle</span>}
                        {type === 'info' && <span className="material-icons-round text-blue-500">info</span>}
                        {title}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <span className="material-icons-round">close</span>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    {message && <p className="text-slate-300 text-sm leading-relaxed mb-4">{message}</p>}
                    {children}
                </div>

                {/* Footer */}
                <div className="p-4 bg-white/5 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-all"
                    >
                        {cancelText}
                    </button>
                    {onConfirm && (
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className={`px-4 py-2 rounded-lg text-sm font-bold text-white shadow-lg transition-all transform hover:scale-105 ${type === 'danger' ? 'bg-red-600 hover:bg-red-500 shadow-red-600/20' :
                                type === 'success' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20' :
                                    'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'
                                }`}
                        >
                            {confirmText}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
