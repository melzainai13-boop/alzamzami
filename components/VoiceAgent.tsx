
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage, Type, FunctionDeclaration } from '@google/genai';
import { AdminSettings, ChatMessage, Order } from '../types';
import { COLORS } from '../constants';
import { encode, decode, decodeAudioData } from '../services/audioUtils';

interface VoiceAgentProps {
  settings: AdminSettings;
  onOrderPlaced: (order: Omit<Order, 'id' | 'timestamp' | 'status'>) => void;
}

const recordOrderFunctionDeclaration: FunctionDeclaration = {
  name: 'recordOrder',
  parameters: {
    type: Type.OBJECT,
    description: 'حفظ طلبية طبية جديدة في النظام عند اكتمال بيانات العميل والمنتجات المطلوبة.',
    properties: {
      customerName: { type: Type.STRING, description: 'اسم العميل الكامل' },
      phone: { type: Type.STRING, description: 'رقم هاتف العميل' },
      address: { type: Type.STRING, description: 'العنوان أو المدينة بالتفصيل' },
      branch: { type: Type.STRING, description: 'الفرع المطلوب الاستلام منه (الخرطوم، عطبرة، أو مدني)' },
      items: { type: Type.STRING, description: 'قائمة بالأصناف والكميات المطلوبة' },
    },
    required: ['customerName', 'phone', 'branch', 'items'],
  },
};

const SUGGESTED_QUESTIONS = [
  "كم سعر مولد الأكسجين 10 لتر؟",
  "عايز أطلب كرتونة جوانتي كشف",
  "شنو الأجهزة المتوفرة في فرع عطبرة؟",
  "أسعار حقن الأنسولين كم؟"
];

const VoiceAgent: React.FC<VoiceAgentProps> = ({ settings, onOrderPlaced }) => {
  const [isActive, setIsActive] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastConfirmedOrder, setLastConfirmedOrder] = useState<any>(null);

  // Audio Contexts
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, lastConfirmedOrder]);

  const addMessage = (role: 'user' | 'model', text: string) => {
    setMessages(prev => [
      ...prev,
      { id: Date.now().toString(), role, text, timestamp: new Date() }
    ]);
  };

  const startSession = async (initialText?: string) => {
    if (isActive && !initialText) return;
    if (isActive && initialText) {
      sessionPromiseRef.current?.then(session => session.sendRealtimeInput({ text: initialText }));
      return;
    }
    
    setIsConnecting(true);
    setLastConfirmedOrder(null);

    try {
      const InputContext = window.AudioContext || (window as any).webkitAudioContext;
      inputAudioContextRef.current = new InputContext({ sampleRate: 16000 });
      outputAudioContextRef.current = new InputContext({ sampleRate: 24000 });
      
      await inputAudioContextRef.current.resume();
      await outputAudioContextRef.current.resume();

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsActive(true);
            setIsConnecting(false);
            
            // Initial prompt or welcome
            sessionPromiseRef.current?.then(session => {
              if (initialText) {
                session.sendRealtimeInput({ text: initialText });
              } else {
                session.sendRealtimeInput({ text: "ابدأ بالتحية: " + settings.welcomeMessage });
              }
            });

            // Try to get microphone, but don't block session if it fails (unless user clicked mic)
            navigator.mediaDevices.getUserMedia({ audio: true })
              .then(stream => {
                streamRef.current = stream;
                const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
                const processor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                
                processor.onaudioprocess = (e) => {
                  const inputData = e.inputBuffer.getChannelData(0);
                  const l = inputData.length;
                  const int16 = new Int16Array(l);
                  for (let i = 0; i < l; i++) {
                    int16[i] = inputData[i] * 32768;
                  }
                  const pcmBlob = {
                    data: encode(new Uint8Array(int16.buffer)),
                    mimeType: 'audio/pcm;rate=16000',
                  };
                  sessionPromiseRef.current?.then(session => {
                    session.sendRealtimeInput({ media: pcmBlob });
                  });
                };

                source.connect(processor);
                processor.connect(inputAudioContextRef.current!.destination);
              })
              .catch(err => {
                console.warn('Microphone access denied:', err);
                if (!initialText) {
                  addMessage('model', '⚠️ لم نتمكن من الوصول للميكروفون. يمكنك الاستمرار عبر الكتابة.');
                }
              });
          },
          onmessage: async (msg: LiveServerMessage) => {
            if (msg.toolCall) {
              for (const fc of msg.toolCall.functionCalls) {
                if (fc.name === 'recordOrder') {
                  const args = fc.args as any;
                  const orderData = {
                    customerName: args.customerName || 'غير معروف',
                    phone: args.phone || 'غير معروف',
                    address: args.address || 'لم يحدد',
                    branch: args.branch || 'غير محدد',
                    items: args.items || 'لا توجد تفاصيل',
                  };
                  
                  onOrderPlaced(orderData);
                  setLastConfirmedOrder(orderData);
                  addMessage('model', `تم تسجيل الطلبية بنجاح ✅`);

                  sessionPromiseRef.current?.then(session => {
                    session.sendToolResponse({
                      functionResponses: [{
                        id: fc.id,
                        name: fc.name,
                        response: { result: "تم الحفظ بنجاح في لوحة التحكم." },
                      }]
                    });
                  });
                }
              }
            }

            const base64Audio = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
              const ctx = outputAudioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const buffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              audioSourcesRef.current.add(source);
              source.onended = () => audioSourcesRef.current.delete(source);
            }

            if (msg.serverContent?.outputTranscription) {
               const text = msg.serverContent.outputTranscription.text;
               setMessages(prev => {
                 const last = prev[prev.length - 1];
                 if (last && last.role === 'model') {
                   return [...prev.slice(0, -1), { ...last, text: last.text + text }];
                 }
                 return [...prev, { id: 'm-' + Date.now(), role: 'model', text, timestamp: new Date() }];
               });
            }

            if (msg.serverContent?.interrupted) {
              audioSourcesRef.current.forEach(s => s.stop());
              audioSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => {
            console.error('Live API Error:', e);
            setIsConnecting(false);
          },
          onclose: () => {
            setIsActive(false);
            if (streamRef.current) {
              streamRef.current.getTracks().forEach(t => t.stop());
            }
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: settings.systemInstruction,
          outputAudioTranscription: {},
          tools: [{ functionDeclarations: [recordOrderFunctionDeclaration] }]
        }
      });

      sessionPromiseRef.current = sessionPromise;

    } catch (err) {
      console.error('Failed to start session:', err);
      setIsConnecting(false);
    }
  };

  const stopSession = () => {
    sessionPromiseRef.current?.then(s => s.close());
    setIsActive(false);
  };

  const handleSendText = (textOverride?: string) => {
    const msg = textOverride || inputText;
    if (!msg.trim()) return;
    
    setInputText('');
    addMessage('user', msg);

    if (isActive) {
      sessionPromiseRef.current?.then(session => {
        session.sendRealtimeInput({ text: msg });
      });
    } else {
      startSession(msg);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 flex flex-col h-[calc(100vh-180px)]">
      <div 
        ref={chatScrollRef}
        className="flex-grow overflow-y-auto mb-6 space-y-4 p-4 rounded-xl border border-gray-100 bg-gray-50/50"
      >
        {messages.length === 0 && (
          <div className="text-center py-12 md:py-20 animate-fadeIn">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-hand-holding-medical text-3xl" style={{ color: COLORS.primary }}></i>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">مرحباً بك في الزمزمي</h2>
            <p className="text-gray-500 max-w-xs mx-auto mb-8">أنا مساعدك الذكي، يمكنني مساعدتك في معرفة الأسعار وتسجيل طلبيتك. اكتب استفسارك أو ابدأ مكالمة.</p>
            
            <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button 
                  key={i}
                  onClick={() => handleSendText(q)}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-full text-xs font-bold text-gray-600 hover:border-blue-900 hover:text-blue-900 transition-all shadow-sm active:scale-95"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
            <div 
              className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm md:text-base shadow-sm ${
                m.role === 'user' 
                  ? 'bg-white text-gray-800 border border-gray-100 rounded-tr-none' 
                  : 'text-white rounded-tl-none'
              }`}
              style={{ backgroundColor: m.role === 'model' ? COLORS.primary : undefined }}
            >
              {m.text}
            </div>
          </div>
        ))}

        {lastConfirmedOrder && (
          <div className="flex justify-end animate-bounceIn">
            <div className="max-w-[85%] bg-green-50 border-2 border-green-200 p-5 rounded-2xl rounded-tl-none shadow-md">
              <div className="flex items-center gap-2 text-green-700 font-black mb-3 border-b border-green-100 pb-2">
                <i className="fas fa-check-circle"></i>
                تم استلام طلبك بنجاح
              </div>
              <div className="space-y-2 text-xs md:text-sm text-gray-700">
                <p><strong>الاسم:</strong> {lastConfirmedOrder.customerName}</p>
                <p><strong>الهاتف:</strong> {lastConfirmedOrder.phone}</p>
                <p><strong>الفرع:</strong> {lastConfirmedOrder.branch}</p>
                <p className="pt-2 border-t border-green-100"><strong>الأصناف:</strong> {lastConfirmedOrder.items}</p>
              </div>
              <p className="mt-4 text-[10px] text-green-600 font-bold">سيتواصل معك فريقنا في أقرب وقت ممكن.</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {/* Suggested Questions (Mini) */}
        {messages.length > 0 && !lastConfirmedOrder && (
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {SUGGESTED_QUESTIONS.slice(0, 3).map((q, i) => (
              <button 
                key={i}
                onClick={() => handleSendText(q)}
                className="whitespace-nowrap px-3 py-1.5 bg-gray-100 rounded-full text-[10px] font-bold text-gray-500 hover:bg-gray-200"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3">
          <input 
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
            placeholder="اكتب استفسارك هنا..."
            className="flex-grow px-4 py-3 rounded-full border border-gray-300 focus:ring-2 focus:ring-blue-900 focus:outline-none bg-white text-gray-900 shadow-sm"
          />
          <button 
            onClick={() => handleSendText()}
            className="w-12 h-12 rounded-full flex items-center justify-center text-white transition-transform active:scale-95 shadow-md flex-shrink-0"
            style={{ backgroundColor: COLORS.primary }}
          >
            <i className="fas fa-paper-plane"></i>
          </button>
        </div>

        <div className="flex items-center justify-center gap-6">
          <button
            disabled={isConnecting}
            onClick={isActive ? stopSession : () => startSession()}
            className={`group relative flex items-center justify-center w-20 h-20 rounded-full shadow-lg transition-all transform hover:scale-105 active:scale-95 ${isActive ? 'bg-red-600' : 'bg-blue-900'}`}
            style={{ backgroundColor: isActive ? COLORS.secondary : COLORS.primary }}
          >
            {isActive ? (
               <i className="fas fa-phone-slash text-2xl text-white"></i>
            ) : (
               <i className={`fas ${isConnecting ? 'fa-spinner fa-spin' : 'fa-microphone'} text-2xl text-white`}></i>
            )}
            {isActive && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
              </span>
            )}
          </button>
          <div className="text-right">
            <p className="text-sm font-bold text-gray-800">
              {isActive ? "المساعد يستمع..." : isConnecting ? "جاري الاتصال..." : "اضغط لبدء المكالمة"}
            </p>
            {!isActive && !isConnecting && <p className="text-xs text-gray-500">تحدث معنا بالعامية السودانية</p>}
          </div>
        </div>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.5s ease-out forwards; }
        @keyframes bounceIn { 
          0% { transform: scale(0.8); opacity: 0; }
          70% { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-bounceIn { animation: bounceIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
      `}</style>
    </div>
  );
};

export default VoiceAgent;
