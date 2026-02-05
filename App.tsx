
import React, { useState } from 'react';
import VoiceAgent from './components/VoiceAgent';
import AdminDashboard from './components/AdminDashboard';
import { AppRoute, AdminSettings, Order } from './types';
import { DEFAULT_SETTINGS, COLORS } from './constants';

const App: React.FC = () => {
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(AppRoute.HOME);
  const [settings, setSettings] = useState<AdminSettings>(() => {
    const saved = localStorage.getItem('zamzami_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Ensure orders array exists for legacy users
      if (!parsed.orders) parsed.orders = [];
      return parsed;
    }
    return DEFAULT_SETTINGS;
  });

  const saveSettings = (newSettings: AdminSettings) => {
    setSettings(newSettings);
    localStorage.setItem('zamzami_settings', JSON.stringify(newSettings));
  };

  const addOrder = (order: Omit<Order, 'id' | 'timestamp' | 'status'>) => {
    const newOrder: Order = {
      ...order,
      id: Date.now().toString(),
      timestamp: new Date().toLocaleString('ar-EG'),
      status: 'جديد'
    };
    const updatedSettings = {
      ...settings,
      orders: [newOrder, ...settings.orders]
    };
    saveSettings(updatedSettings);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white overflow-x-hidden">
      {/* Header */}
      <header className="py-6 px-4 md:px-8 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-50">
        <h1 className="text-2xl md:text-4xl font-black tracking-tighter text-gray-900" style={{ color: COLORS.primary }}>
          الزمزمي للمستهلكات الطبية
        </h1>
        <button 
          onClick={() => setCurrentRoute(prev => prev === AppRoute.HOME ? AppRoute.ADMIN : AppRoute.HOME)}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          title={currentRoute === AppRoute.HOME ? "لوحة التحكم" : "الرئيسية"}
        >
          <i className={`fas ${currentRoute === AppRoute.HOME ? 'fa-cog' : 'fa-home'} text-xl`} style={{ color: COLORS.primary }}></i>
          {currentRoute === AppRoute.HOME && settings.orders.filter(o => o.status === 'جديد').length > 0 && (
             <span className="absolute top-2 right-2 bg-red-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
               {settings.orders.filter(o => o.status === 'جديد').length}
             </span>
          )}
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        {currentRoute === AppRoute.HOME ? (
          <VoiceAgent settings={settings} onOrderPlaced={addOrder} />
        ) : (
          <AdminDashboard settings={settings} onSave={saveSettings} onBack={() => setCurrentRoute(AppRoute.HOME)} />
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 px-4 bg-gray-50 border-t border-gray-200 text-center text-sm text-gray-700">
        <p className="mb-2 leading-relaxed">
          شكراً لثقتكم بشركة <span className="font-bold" style={{ color: COLORS.secondary }}>الزمزمي للمستهلكات الطبية</span> Powered by <span className="font-semibold">Astric Company</span> | 
          لطلب هذا النظام، تواصل معنا: <a href={`tel:${settings.contactNumber}`} className="font-bold underline ml-1" style={{ color: COLORS.primary }}>{settings.contactNumber}</a>
        </p>
      </footer>
    </div>
  );
};

export default App;
