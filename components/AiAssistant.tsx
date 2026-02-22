import React, { useState, useRef, useEffect } from 'react';
import { getGeminiResponse } from '../services/geminiService';
import { ChatMessage } from '../types';
import { Logo } from './ui/Logo';

export const AiAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'model', text: 'Hello, I am Palladium AI. How can I assist with operations today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [useMaps, setUseMaps] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Check for booking intent (heuristic)
      const lowerInput = userMsg.text.toLowerCase();
      if (lowerInput.includes('reserva') || lowerInput.includes('booking') || lowerInput.includes('taxi') || lowerInput.includes('traslado')) {
        // Attempt to parse booking
        const { parseBookingDetails } = await import('../services/geminiService');
        const bookingData = await parseBookingDetails(userMsg.text);

        if (bookingData && (bookingData.origin || bookingData.destination || bookingData.passenger)) {
          // It looks like a valid booking request
          const modelMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: `He detectado una solicitud de reserva. He preparado el formulario con los datos extraídos.\n\nOrigen: ${bookingData.origin || '?'}\nDestino: ${bookingData.destination || '?'}\nFecha: ${bookingData.pickup_date || '?'}\n\nRevisa el formulario que se ha abierto.`,
          };
          setMessages(prev => [...prev, modelMsg]);

          // Dispatch event to open modal
          const event = new CustomEvent('open-booking-modal', { detail: bookingData });
          window.dispatchEvent(event);
          setLoading(false);
          return;
        }
      }

      const { text, mapData } = await getGeminiResponse(userMsg.text, useMaps);
      const modelMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text,
        isMapResponse: !!mapData,
        mapData
      };
      setMessages(prev => [...prev, modelMsg]);
    } catch (e) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: 'Connection error:' + e }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-brand-charcoal text-white rounded-full shadow-2xl border border-white/5 flex items-center justify-center z-50 transition-all hover:scale-110 active:scale-95 group"
      >
        {isOpen ? (
          <span className="material-icons-round text-2xl">close</span>
        ) : (
          <Logo variant="icon" className="w-8 h-8 brightness-125 group-hover:brightness-150 transition-all" color="white" />
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-80 md:w-96 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl flex flex-col z-50 h-[500px] overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-200">

          {/* Header */}
          <div className="p-4 border-b border-white/5 bg-brand-charcoal/50 flex justify-between items-center">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Logo variant="icon" className="w-5 h-5" color="gold" />
              Palladium AI
            </h3>
            <div className="flex items-center gap-2 text-xs">
              <span className={`px-2 py-1 rounded-full border cursor-pointer transition-colors ${useMaps ? 'bg-green-500/20 border-green-500 text-green-400' : 'border-slate-600 text-slate-400'}`} onClick={() => setUseMaps(!useMaps)}>
                Maps {useMaps ? 'ON' : 'OFF'}
              </span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-200 rounded-bl-none'}`}>
                  <p>{msg.text}</p>
                  {msg.isMapResponse && msg.mapData && (
                    <div className="mt-2 space-y-2">
                      {msg.mapData.map((chunk: any, i: number) =>
                        chunk.maps?.placeAnswerSources?.map((place: any, j: number) => (
                          place.reviewSnippets?.map((review: any, k: number) => (
                            <div key={`${i}-${j}-${k}`} className="bg-slate-900/50 p-2 rounded text-xs border-l-2 border-green-500">
                              <p className="text-slate-400 truncate">{review.text}</p>
                            </div>
                          ))
                        ))
                      )}
                      <p className="text-[10px] text-green-400 mt-1 flex items-center gap-1">
                        <span className="material-icons-round text-[10px]">place</span>
                        Grounded with Google Maps
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-800 p-3 rounded-2xl rounded-bl-none">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-100"></span>
                    <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-200"></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 bg-slate-800/50 border-t border-slate-700">
            <div className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about flights, traffic..."
                className="w-full bg-slate-900 text-white text-sm rounded-full pl-4 pr-10 py-3 border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
              <button
                onClick={handleSend}
                className="absolute right-2 top-2 p-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-500 transition-colors"
              >
                <span className="material-icons-round text-sm">send</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
