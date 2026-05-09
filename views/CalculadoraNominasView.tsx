import React from 'react';

export const CalculadoraNominasView = () => {
    return (
        <div className="flex-1 w-full h-full bg-brand-black overflow-hidden">
            <iframe 
                src="https://nominas.palladiumtransfers.com" 
                className="w-full h-full border-none"
                title="Calculadora de Nóminas"
                allow="geolocation; microphone; camera"
            />
        </div>
    );
};
