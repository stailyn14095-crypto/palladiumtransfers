import React, { useState, useMemo } from 'react';
import { useSupabaseData } from '../hooks/useSupabaseData';

interface DriverCalendarViewProps {
    driverId: string;
}

export const DriverCalendarView: React.FC<DriverCalendarViewProps> = ({ driverId }) => {
    const { data: shifts } = useSupabaseData('shifts');
    const [currentDate, setCurrentDate] = useState(new Date());

    const myShifts = useMemo(() => {
        if (!shifts || !driverId) return [];
        return shifts.filter((s: any) => s.driver_id === driverId);
    }, [shifts, driverId]);

    const getDaysInMonth = (year: number, month: number) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (year: number, month: number) => {
        const day = new Date(year, month, 1).getDay();
        return day === 0 ? 6 : day - 1; // Adjust so Monday is 0
    };

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const blanks = Array.from({ length: firstDay }, (_, i) => i);

    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));

    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

    const getShiftForDay = (day: number) => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return myShifts.find((s: any) => s.date === dateStr);
    };

    const getShiftColor = (type: string) => {
        if (!type) return 'bg-brand-black border-white/5 text-white/20';
        const t = type.toLowerCase();
        if (t.includes('mañana')) return 'bg-brand-gold/20 border-brand-gold/50 text-brand-gold';
        if (t.includes('tarde')) return 'bg-orange-500/20 border-orange-500/50 text-orange-400';
        if (t.includes('noche')) return 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400';
        if (t.includes('libre') || t.includes('off')) return 'bg-green-500/20 border-green-500/50 text-green-400';
        return 'bg-brand-platinum/10 border-brand-platinum/30 text-white';
    };

    const getShiftIcon = (type: string) => {
        if (!type) return null;
        const t = type.toLowerCase();
        if (t.includes('mañana')) return 'light_mode';
        if (t.includes('tarde')) return 'wb_twilight';
        if (t.includes('noche')) return 'dark_mode';
        if (t.includes('libre') || t.includes('off')) return 'weekend';
        return 'schedule';
    };

    return (
        <div className="flex flex-col h-full bg-brand-charcoal overflow-hidden relative">
            <div className="p-6 shrink-0 bg-brand-black/40 backdrop-blur-md border-b border-white/5 flex items-center justify-between sticky top-0 z-10">
                <div>
                    <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                        <span className="material-icons-round text-brand-gold">calendar_month</span>
                        Mi Calendario
                    </h2>
                    <p className="text-xs text-brand-platinum/50 uppercase tracking-widest mt-1">
                        Turnos y libranzas
                    </p>
                </div>
                
                <div className="flex items-center gap-4 bg-brand-black rounded-xl p-1 border border-white/5 shadow-inner">
                    <button onClick={prevMonth} className="p-2 hover:bg-white/5 rounded-lg text-white transition-colors">
                        <span className="material-icons-round text-sm">chevron_left</span>
                    </button>
                    <div className="w-32 text-center font-bold text-sm text-brand-platinum tracking-widest uppercase">
                        {monthNames[month]} {year}
                    </div>
                    <button onClick={nextMonth} className="p-2 hover:bg-white/5 rounded-lg text-white transition-colors">
                        <span className="material-icons-round text-sm">chevron_right</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                <div className="max-w-4xl mx-auto">
                    <div className="grid grid-cols-7 gap-3 mb-3">
                        {weekDays.map(day => (
                            <div key={day} className="text-center text-[10px] font-black uppercase text-brand-platinum/50 tracking-widest pb-2">
                                {day}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-2 md:gap-3">
                        {blanks.map(b => (
                            <div key={`blank-${b}`} className="aspect-square rounded-xl bg-brand-black/20 border border-white/5"></div>
                        ))}
                        
                        {days.map(day => {
                            const shift = getShiftForDay(day);
                            const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
                            const shiftColor = getShiftColor(shift?.type);
                            const icon = getShiftIcon(shift?.type);

                            return (
                                <div 
                                    key={day} 
                                    className={`relative aspect-square rounded-xl border flex flex-col p-2 transition-all ${shiftColor} ${isToday ? 'ring-2 ring-brand-gold ring-offset-2 ring-offset-brand-charcoal' : ''}`}
                                >
                                    <div className="flex justify-between items-start w-full">
                                        <span className={`text-sm font-bold ${isToday ? 'text-white' : ''}`}>
                                            {day}
                                        </span>
                                        {icon && (
                                            <span className="material-icons-round text-[14px] opacity-80">{icon}</span>
                                        )}
                                    </div>
                                    
                                    <div className="flex-1 flex flex-col justify-end">
                                        {shift ? (
                                            <div className="text-[9px] md:text-xs font-bold leading-tight line-clamp-2">
                                                {shift.type}
                                                {shift.hours && <div className="text-[8px] md:text-[10px] font-medium opacity-70 mt-0.5">{shift.hours}</div>}
                                            </div>
                                        ) : (
                                            <div className="text-[9px] font-medium opacity-30">Sin turno</div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    
                    {/* Legend */}
                    <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 bg-brand-black/30 p-4 rounded-xl border border-white/5">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-brand-gold/40 border border-brand-gold"></div>
                            <span className="text-xs text-brand-platinum/70 uppercase tracking-wider font-bold">Mañana</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-orange-500/40 border border-orange-500"></div>
                            <span className="text-xs text-brand-platinum/70 uppercase tracking-wider font-bold">Tarde</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-indigo-500/40 border border-indigo-500"></div>
                            <span className="text-xs text-brand-platinum/70 uppercase tracking-wider font-bold">Noche</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-500/40 border border-green-500"></div>
                            <span className="text-xs text-brand-platinum/70 uppercase tracking-wider font-bold">Libre</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
