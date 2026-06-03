import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { supabase } from '../services/supabase';
import { Logo } from './ui/Logo';

// Inicializar Gemini
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

// Definición de Herramientas para Gemini (Tools)
const tools = [
    {
        name: 'crear_reserva',
        description: 'Crea una reserva nueva en el sistema de Palladium Transfers. Siempre entrará en estado Pending.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                client_name: { type: SchemaType.STRING, description: 'Nombre completo del cliente' },
                phone: { type: SchemaType.STRING, description: 'Teléfono de contacto' },
                email: { type: SchemaType.STRING, description: 'Correo electrónico del cliente' },
                origin: { type: SchemaType.STRING, description: 'Origen (ej: ALC, Benidorm, etc.)' },
                destination: { type: SchemaType.STRING, description: 'Destino (ej: Altea, Calpe, etc.)' },
                pickup_date: { type: SchemaType.STRING, description: 'Fecha de recogida en formato YYYY-MM-DD' },
                pickup_time: { type: SchemaType.STRING, description: 'Hora de recogida en formato HH:MM' },
                pax: { type: SchemaType.NUMBER, description: 'Número de pasajeros' },
                flight_number: { type: SchemaType.STRING, description: 'Número de vuelo (opcional)' }
            },
            required: ['client_name', 'email', 'origin', 'destination', 'pickup_date', 'pickup_time']
        }
    },
    {
        name: 'consultar_estado_vuelo',
        description: 'Consulta el estado de un vuelo usando la API de AirLabs.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                flight_iata: { type: SchemaType.STRING, description: 'El número de vuelo IATA (ej: FR4032, VY1234)' }
            },
            required: ['flight_iata']
        }
    },
    {
        name: 'consultar_disponibilidad_conductores',
        description: 'Obtiene la lista de reservas de hoy para comprobar solapamientos o consultar quién está libre.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                fecha: { type: SchemaType.STRING, description: 'Fecha a consultar en formato YYYY-MM-DD (por defecto hoy)' }
            }
        }
    },
    {
        name: 'consultar_tarifa',
        description: 'Consulta el precio estimado para un trayecto basado en las tarifas de Palladium Transfers.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                origin: { type: SchemaType.STRING, description: 'Palabra clave corta del origen (ej: Alicante, Benidorm, ALC)' },
                destination: { type: SchemaType.STRING, description: 'Palabra clave corta del destino (ej: Altea, Valencia, VLC)' }
            },
            required: ['origin', 'destination']
        }
    }
];

interface AiAssistantProps {
    role?: 'client' | 'admin' | 'driver' | null;
    userName?: string;
}

export const AiAssistant: React.FC<AiAssistantProps> = ({ role = 'client', userName }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{ role: 'user' | 'model' | 'system', text: string }[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatSessionRef = useRef<any>(null);

    // Prompt del Sistema según el rol
    const getSystemInstruction = () => {
        let base = `Eres el Asistente Virtual Inteligente de Palladium Transfers. Siempre responde de forma profesional, concisa y elegante.\n\n`;
        if (role === 'admin') {
            base += `ROL: Operador de Tráfico y Soporte al Administrador.\n`;
            base += `Eres el copiloto del encargado de tráfico. Tu trabajo es ayudar a crear reservas rápidamente a partir de texto (ej. copiar y pegar un WhatsApp), alertar de solapamientos en las horas de los conductores, y consultar llegadas de vuelos (sobre todo al aeropuerto de Alicante ALC).\n`;
            base += `REGLAS:\n- Si te piden crear una reserva, usa la herramienta 'crear_reserva'.\n- Si te pegan un bloque de texto desordenado con detalles de un viaje, extrae los datos y crea la reserva directamente.\n- Si necesitas comprobar vuelos, usa 'consultar_estado_vuelo'.\n- Para comprobar agendas de conductores, usa 'consultar_disponibilidad_conductores'.`;
        } else {
            base += `ROL: Recepcionista VIP y Atención al Cliente.\n`;
            base += `Tu trabajo es ayudar a los clientes a entender nuestros servicios, resolver sus dudas sobre nuestra flota (Vehículos eléctricos, Mercedes Clase V, Wi-Fi, etc.), y ayudarles a pre-reservar si te lo piden.\n`;
            base += `REGLAS:\n- Ofrece siempre un tono muy lujoso y amable.\n- Si el cliente te da los detalles de su viaje, puedes usar la herramienta 'crear_reserva' para guardarla en el sistema como solicitud pendiente.\n- Si te piden precios o presupuestos, usa 'consultar_tarifa' para darles una estimación.\n- Nunca reveles información interna de los conductores.\n- MUY IMPORTANTE: Cuando pidas los datos para una reserva, asegúrate de pedir SIEMPRE el correo electrónico (email) y un teléfono.\n- DIRECTRIZ CRÍTICA: Nunca respondas con frases como "Permítame un instante voy a consultar". Si debes usar una herramienta, úsala de inmediato en la misma respuesta.`;
        }
        return base;
    };

    // Inicializar chat session
    useEffect(() => {
        if (!apiKey) return;
        try {
            const model = genAI.getGenerativeModel({
                model: "gemini-2.5-flash",
                systemInstruction: getSystemInstruction(),
                tools: [{ functionDeclarations: tools as any }]
            });
            chatSessionRef.current = model.startChat({ history: [] });
            
            // Mensaje de bienvenida
            setMessages([{
                role: 'model',
                text: role === 'admin' 
                    ? `¡Hola ${userName || 'Operador'}! Soy tu Asistente de Tráfico de Inteligencia Artificial. Pega aquí los servicios o pídeme revisar vuelos y disponibilidades.` 
                    : `Bienvenido a Palladium Transfers. Soy su asistente virtual VIP. ¿En qué le puedo ayudar hoy con su traslado?`
            }]);
        } catch (error) {
            console.error("Error inicializando Gemini:", error);
        }
    }, [role, userName]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleFunctionCall = async (functionCall: any) => {
        const { name, args } = functionCall;
        console.log(`Ejecutando herramienta: ${name}`, args);
        
        try {
            if (name === 'crear_reserva') {
                const newBooking = {
                    passenger: args.client_name,
                    phone: args.phone || '',
                    email: args.email || '',
                    origin: args.origin,
                    destination: args.destination,
                    pickup_date: args.pickup_date,
                    pickup_time: args.pickup_time,
                    pax_count: args.pax || 1,
                    flight_number: args.flight_number || '',
                    status: 'Pending',
                    notes: 'REVISAR: Creado por IA desde el Chat.'
                };
                
                // Dispatch event to open the modal in ReservasView.tsx
                window.dispatchEvent(new CustomEvent('open-booking-modal', { detail: newBooking }));
                
                return { result: 'He abierto el formulario de Nueva Reserva con los datos extraídos para que el operador lo revise y guarde.', booking_details: newBooking };
            }
            
            if (name === 'consultar_estado_vuelo') {
                const airlabsKey = import.meta.env.VITE_AIRLABS_API_KEY;
                if (!airlabsKey) return { error: 'No hay API key de AirLabs configurada.' };
                
                const res = await fetch(`https://airlabs.co/api/v9/flight?flight_iata=${args.flight_iata}&api_key=${airlabsKey}`);
                const data = await res.json();
                if (data.error) return { error: data.error.message };
                
                return { 
                    result: `Datos del vuelo ${args.flight_iata}`, 
                    status: data.response?.status,
                    arr_estimated: data.response?.arr_estimated,
                    arr_actual: data.response?.arr_actual,
                    arr_terminal: data.response?.arr_terminal,
                    arr_gate: data.response?.arr_gate,
                    delayed: data.response?.delayed
                };
            }
            
            if (name === 'consultar_disponibilidad_conductores') {
                const targetDate = args.fecha || new Date().toISOString().split('T')[0];
                const { data, error } = await supabase.from('bookings').select('*, driver:driver_id(nombre)').eq('pickup_date', targetDate);
                if (error) throw error;
                
                const resumen = data.map(b => `[ID:${b.id}] ${b.pickup_time} | Conductor: ${b.driver?.nombre || 'NO ASIGNADO'} | Origen: ${b.origin} -> Destino: ${b.destination} | Estado: ${b.status}`);
                return { result: 'Listado de reservas encontradas para la fecha.', total: data.length, reservas: resumen };
            }
            
            if (name === 'consultar_tarifa') {
                const { origin, destination } = args;
                const { data, error } = await supabase.from('tariffs').select('*')
                    .or(`and(origin.ilike.%${origin}%,destination.ilike.%${destination}%),and(origin.ilike.%${destination}%,destination.ilike.%${origin}%)`);
                
                if (error) return { error: error.message };
                if (!data || data.length === 0) return { result: 'No se encontraron tarifas exactas para esa ruta. El cliente deberá solicitar un presupuesto personalizado.' };
                
                // Filtrar las tarifas de cliente
                const clientTariffs = data.filter(t => t.audience_type === 'Cliente' || !t.audience_type);
                if (clientTariffs.length === 0) return { result: 'No hay tarifas de cliente configuradas para esta ruta.' };
                
                const prices = clientTariffs.map(t => `${t.class || 'Standard'}: ${t.base_price || t.price || 0}€`);
                return { result: 'Tarifas encontradas', ruta: `${origin} - ${destination}`, precios: prices };
            }
            
            return { error: 'Función no encontrada' };
        } catch (e: any) {
            return { error: e.message };
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading || !chatSessionRef.current) return;

        const userText = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userText }]);
        setIsLoading(true);

        try {
            let result = await chatSessionRef.current.sendMessage(userText);
            
            let callCount = 0;
            // Loop for handling function calls
            while (result.response.functionCalls && result.response.functionCalls.length > 0 && callCount < 3) {
                callCount++;
                const call = result.response.functionCalls[0];
                const functionResponse = await handleFunctionCall(call);
                
                // Return result to Gemini
                result = await chatSessionRef.current.sendMessage([{
                    functionResponse: {
                        name: call.name,
                        response: functionResponse
                    }
                }]);
            }
            
            let modelResponse = "Respuesta recibida.";
            try {
                modelResponse = result.response.text();
            } catch (e) {
                console.warn("No text in Gemini response", e);
                modelResponse = "He verificado la información en el sistema, pero no pude generar una respuesta clara.";
            }
            
            if (!modelResponse || modelResponse.trim() === "") {
                if (callCount > 0) {
                    modelResponse = "He completado la acción solicitada. Revisa la pantalla para continuar.";
                } else {
                    modelResponse = "He realizado la comprobación, pero no tengo una respuesta definitiva. ¿Puedo ayudarte con algo más?";
                }
            }
            
            setMessages(prev => [...prev, { role: 'model', text: modelResponse }]);
            
        } catch (error: any) {
            console.error("Error en el chat:", error);
            const errorMessage = error?.message || 'Error desconocido';
            if (errorMessage.includes('429') || errorMessage.toLowerCase().includes('quota') || errorMessage.toLowerCase().includes('too many requests')) {
                setMessages(prev => [...prev, { role: 'system', text: 'Has alcanzado el límite de peticiones gratuitas por minuto (15/min). Por favor, espera un minuto e inténtalo de nuevo.' }]);
            } else {
                setMessages(prev => [...prev, { role: 'system', text: `Error de API: ${errorMessage}` }]);
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (!apiKey) return null; // No mostrar si no hay API Key

    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end">
            {/* Chat Window */}
            {isOpen && (
                <div className="w-[380px] h-[550px] mb-4 bg-brand-charcoal/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in">
                    {/* Header */}
                    <div className="p-4 bg-black/40 border-b border-white/5 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-brand-platinum/10 flex items-center justify-center">
                                <Logo variant="icon" className="w-5 h-5 brightness-125" color="white" />
                            </div>
                            <div>
                                <h3 className="text-white text-xs font-bold uppercase tracking-widest">
                                    {role === 'admin' ? 'Asistente de Tráfico' : 'Soporte Virtual VIP'}
                                </h3>
                                <p className="text-[9px] text-emerald-400 font-bold uppercase tracking-[0.2em] flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Online
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-white/50 hover:text-white transition-colors">
                            <span className="material-icons-round text-lg">close</span>
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                                    msg.role === 'user' 
                                        ? 'bg-brand-platinum text-brand-black rounded-tr-sm' 
                                        : msg.role === 'system'
                                            ? 'bg-red-500/20 text-red-200 border border-red-500/30 text-[10px] italic text-center w-full'
                                            : 'bg-white/5 text-white rounded-tl-sm border border-white/10'
                                }`}>
                                    {/* Renderizar markdown simple: Negritas */}
                                    {msg.text.split('**').map((part, i) => i % 2 === 1 ? <strong key={i} className={msg.role === 'user' ? 'text-black font-black' : 'text-brand-gold font-bold'}>{part}</strong> : part)}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1 items-center">
                                    <div className="w-1.5 h-1.5 bg-brand-platinum/50 rounded-full animate-bounce"></div>
                                    <div className="w-1.5 h-1.5 bg-brand-platinum/50 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                    <div className="w-1.5 h-1.5 bg-brand-platinum/50 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-3 bg-black/40 border-t border-white/5">
                        <form onSubmit={handleSend} className="relative flex items-center">
                            <input 
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Escribe un mensaje..."
                                disabled={isLoading}
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-brand-platinum/30 transition-all disabled:opacity-50"
                            />
                            <button 
                                type="submit" 
                                disabled={!input.trim() || isLoading}
                                className="absolute right-2 w-8 h-8 rounded-lg bg-brand-platinum text-brand-black flex items-center justify-center disabled:opacity-50 hover:bg-white transition-colors"
                            >
                                <span className="material-icons-round text-sm">send</span>
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Floating Button */}
            {!isOpen && (
                <button 
                    onClick={() => setIsOpen(true)}
                    className="w-14 h-14 bg-brand-platinum text-brand-black rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-105 transition-all group"
                >
                    <Logo variant="icon" className="w-8 h-8 brightness-0 group-hover:scale-110 transition-transform" />
                </button>
            )}
        </div>
    );
};
