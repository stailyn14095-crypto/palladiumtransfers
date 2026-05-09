import React from 'react';

export const CashReconciliationView: React.FC = () => {
    return (
        <div className="flex-1 w-full h-full bg-brand-black overflow-hidden">
            <iframe 
                src="https://efectivo.palladiumtransfers.com" 
                className="w-full h-full border-none"
                title="Cuadre de Efectivo"
                allow="geolocation; microphone; camera"
            />
        </div>
    );
};
