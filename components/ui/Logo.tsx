import React from 'react';

interface LogoProps {
    className?: string;
    variant?: 'full' | 'icon';
    color?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = '', variant = 'full', color = 'currentColor' }) => {
    return (
        <div className={`flex flex-col items-center justify-center ${className}`}>
            <svg
                viewBox="0 0 440 180"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={variant === 'icon' ? 'w-full h-auto' : 'w-full max-w-[280px] h-auto'}
            >
                {/* Middle Line */}
                <path
                    d="M 40 85 L 340 85"
                    stroke={color}
                    strokeWidth="4"
                    strokeLinecap="round"
                    fill="none"
                />
                {/* Top/Front Line */}
                <path
                    d="M 120 68 Q 220 20 310 80 Q 325 85 340 85 L 380 85 Q 405 85 415 110"
                    stroke={color}
                    strokeWidth="4"
                    strokeLinecap="round"
                    fill="none"
                />
                {/* Bottom Line */}
                <path
                    d="M 160 110 L 415 110"
                    stroke={color}
                    strokeWidth="4"
                    strokeLinecap="round"
                    fill="none"
                />

                {variant === 'full' && (
                    <>
                        {/* PALLADIUM TRANSFERS Text */}
                        <text
                            x="220"
                            y="140"
                            textAnchor="middle"
                            fill={color}
                            style={{
                                fontFamily: 'system-ui, -apple-system, sans-serif',
                                fontWeight: 300,
                                letterSpacing: '0.15em',
                                fontSize: '24px',
                                textTransform: 'uppercase'
                            }}
                        >
                            PALLADIUM TRANSFERS
                        </text>
                        {/* EXCELLENCE IN MOTION */}
                        <text
                            x="220"
                            y="165"
                            textAnchor="middle"
                            fill={color}
                            style={{
                                fontFamily: 'system-ui, -apple-system, sans-serif',
                                fontWeight: 600,
                                letterSpacing: '0.4em',
                                fontSize: '10px',
                                textTransform: 'uppercase',
                                opacity: 0.8
                            }}
                        >
                            EXCELLENCE IN MOTION
                        </text>
                    </>
                )}
            </svg>
        </div>
    );
};
