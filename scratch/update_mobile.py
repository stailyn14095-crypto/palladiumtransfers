import re

filepath = r"j:\PALLADIUM TRANSFERS\palladium-operations-hub\views\DriverAppView.tsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Make header padding responsive
content = content.replace(
    'className="relative z-10 bg-brand-charcoal/50 backdrop-blur-xl p-8 border-b border-white/5"',
    'className="relative z-10 bg-brand-charcoal/50 backdrop-blur-xl p-4 md:p-8 border-b border-white/5"'
)

content = content.replace(
    '<div className="relative z-10 px-8 mt-6">',
    '<div className="relative z-10 px-4 md:px-8 mt-6">'
)

content = content.replace(
    '<div className="relative z-10 p-8 space-y-8">',
    '<div className="relative z-10 p-4 md:p-8 space-y-6 md:space-y-8">'
)

# Make tabs scrollable horizontally on very small screens instead of cramping
content = content.replace(
    '<div className="flex bg-brand-charcoal/40 backdrop-blur-md p-1 rounded-2xl border border-white/5">',
    '<div className="flex bg-brand-charcoal/40 backdrop-blur-md p-1 rounded-2xl border border-white/5 overflow-x-auto no-scrollbar snap-x">'
)

content = content.replace(
    'className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === \'services\' ? \'bg-white text-brand-black shadow-lg\' : \'text-brand-platinum/30 hover:text-white\'}`}',
    'className={`min-w-[100px] flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all snap-start ${activeTab === \'services\' ? \'bg-white text-brand-black shadow-lg\' : \'text-brand-platinum/30 hover:text-white\'}`}'
)

content = content.replace(
    'className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === \'history\' ? \'bg-brand-platinum text-brand-black shadow-lg\' : \'text-brand-platinum/30 hover:text-white\'}`}',
    'className={`min-w-[100px] flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all snap-start ${activeTab === \'history\' ? \'bg-brand-platinum text-brand-black shadow-lg\' : \'text-brand-platinum/30 hover:text-white\'}`}'
)

content = content.replace(
    'className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === \'earnings\' ? \'bg-brand-gold text-brand-black shadow-lg\' : \'text-brand-platinum/30 hover:text-white\'}`}',
    'className={`min-w-[100px] flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all snap-start ${activeTab === \'earnings\' ? \'bg-brand-gold text-brand-black shadow-lg\' : \'text-brand-platinum/30 hover:text-white\'}`}'
)

content = content.replace(
    'className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === \'jornada\' ? \'bg-blue-500 text-white shadow-lg\' : \'text-brand-platinum/30 hover:text-white\'}`}',
    'className={`min-w-[100px] flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all snap-start ${activeTab === \'jornada\' ? \'bg-blue-500 text-white shadow-lg\' : \'text-brand-platinum/30 hover:text-white\'}`}'
)


# Reduce Current Booking Padding
content = content.replace(
    'className="group relative bg-brand-charcoal/30 backdrop-blur-md border border-white/5 border-l-brand-gold/50 border-l-4 rounded-[2.5rem] p-8 overflow-hidden transition-all duration-500 hover:bg-brand-charcoal/50 shadow-[0_0_40px_rgba(197,160,89,0.05)]"',
    'className="group relative bg-brand-charcoal/30 backdrop-blur-md border border-white/5 border-l-brand-gold/50 border-l-4 rounded-3xl md:rounded-[2.5rem] p-5 md:p-8 overflow-hidden transition-all duration-500 hover:bg-brand-charcoal/50 shadow-[0_0_40px_rgba(197,160,89,0.05)]"'
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Mobile styles updated.")
