
import React, { useState } from 'react';
import { AdminSettings, Order } from '../types';
import { COLORS } from '../constants';

interface AdminDashboardProps {
  settings: AdminSettings;
  onSave: (settings: AdminSettings) => void;
  onBack: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ settings, onSave, onBack }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<'settings' | 'orders'>('orders');
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [localSettings, setLocalSettings] = useState<AdminSettings>(settings);
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (user === settings.adminUser && pass === settings.adminPass) {
      setIsLoggedIn(true);
      setError('');
    } else {
      setError('بيانات الدخول غير صحيحة');
    }
  };

  const handleSave = () => {
    onSave(localSettings);
    alert('تم حفظ التعديلات بنجاح');
  };

  const deleteOrder = (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذه الطلبية؟')) {
      const updated = {
        ...localSettings,
        orders: localSettings.orders.filter(o => o.id !== id)
      };
      setLocalSettings(updated);
      onSave(updated);
    }
  };

  const toggleOrderStatus = (id: string) => {
    const updated = {
      ...localSettings,
      orders: localSettings.orders.map(o => 
        o.id === id ? { ...o, status: (o.status === 'جديد' ? 'مكتمل' : 'جديد') as 'جديد' | 'مكتمل' } : o
      )
    };
    setLocalSettings(updated);
    onSave(updated);
  };

  const exportPDF = (order: Order) => {
    const printWindow = window.open('', '_blank', 'width=800,height=1000');
    if (!printWindow) return;

    const html = `
      <html lang="ar" dir="rtl">
        <head>
          <title>فاتورة - ${order.customerName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap');
            body { font-family: 'Cairo', sans-serif; padding: 40px; color: #333; line-height: 1.6; }
            .header { border-bottom: 4px solid ${COLORS.primary}; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
            .logo-text { font-size: 28px; font-weight: 800; color: ${COLORS.primary}; }
            .invoice-title { font-size: 24px; font-weight: 700; color: ${COLORS.secondary}; }
            .section { margin-bottom: 25px; border: 1px solid #eee; padding: 15px; border-radius: 8px; }
            .section-title { font-weight: 700; color: ${COLORS.primary}; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; display: block; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
            .label { font-weight: 700; color: #666; font-size: 14px; }
            .value { font-size: 16px; margin-top: 4px; }
            .items-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            .items-table th { background: ${COLORS.primary}; color: white; padding: 12px; text-align: right; }
            .items-table td { border: 1px solid #eee; padding: 12px; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #eee; padding-top: 20px; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-text">الزمزمي للمستهلكات الطبية</div>
            <div class="invoice-title">فاتورة طلبية</div>
          </div>
          
          <div class="grid">
            <div class="section">
              <span class="section-title">بيانات العميل</span>
              <div><span class="label">الاسم:</span> <div class="value">${order.customerName}</div></div>
              <div style="margin-top:10px;"><span class="label">رقم الهاتف:</span> <div class="value">${order.phone}</div></div>
            </div>
            <div class="section">
              <span class="section-title">تفاصيل التوصيل</span>
              <div><span class="label">الفرع:</span> <div class="value">${order.branch}</div></div>
              <div style="margin-top:10px;"><span class="label">العنوان:</span> <div class="value">${order.address}</div></div>
            </div>
          </div>

          <div class="section" style="margin-top: 10px;">
            <span class="section-title">الطلبية والمنتجات</span>
            <div class="value" style="white-space: pre-wrap;">${order.items}</div>
          </div>

          <div class="grid" style="margin-top: 20px;">
            <div><span class="label">رقم الطلب:</span> <div class="value">#${order.id.slice(-6)}</div></div>
            <div><span class="label">تاريخ الطلب:</span> <div class="value">${order.timestamp}</div></div>
          </div>

          <div class="footer">
            شكراً لتعاملكم مع شركة الزمزمي للمستهلكات والأجهزة الطبية<br>
            تواصل معنا: ${localSettings.contactNumber}
          </div>
          
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const inputStyle = "w-full px-4 py-3 rounded-lg border-2 border-gray-400 focus:border-blue-900 outline-none transition-colors bg-white text-gray-900";

  if (!isLoggedIn) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 border border-gray-200 rounded-2xl bg-white shadow-xl no-print">
        <h2 className="text-2xl font-bold mb-6 text-center" style={{ color: COLORS.primary }}>دخول الإدارة</h2>
        <form onSubmit={handleLogin} className="space-y-4 text-right">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">اسم المستخدم</label>
            <input 
              type="text" 
              value={user} 
              onChange={(e) => setUser(e.target.value)}
              className={inputStyle}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">كلمة المرور</label>
            <input 
              type="password" 
              value={pass} 
              onChange={(e) => setPass(e.target.value)}
              className={inputStyle}
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button 
            type="submit"
            className="w-full py-3 rounded-lg text-white font-bold transition-opacity hover:opacity-90 mt-4 shadow-md"
            style={{ backgroundColor: COLORS.primary }}
          >
            دخول
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 text-right no-print">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-800 flex items-center gap-2">
          <i className="fas fa-times"></i> إغلاق
        </button>
        <h2 className="text-2xl font-bold" style={{ color: COLORS.primary }}>لوحة التحكم - الزمزمي</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 bg-gray-100 p-1 rounded-xl w-fit mx-auto md:mx-0">
        <button 
          onClick={() => setActiveTab('orders')}
          className={`px-8 py-2 rounded-lg font-bold transition-all ${activeTab === 'orders' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
          style={{ color: activeTab === 'orders' ? COLORS.primary : undefined }}
        >
          <i className="fas fa-shopping-cart ml-2"></i> قائمة الطلبات
          {localSettings.orders.filter(o => o.status === 'جديد').length > 0 && (
            <span className="mr-2 bg-red-600 text-white text-[10px] rounded-full px-1.5 py-0.5">
              {localSettings.orders.filter(o => o.status === 'جديد').length}
            </span>
          )}
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`px-8 py-2 rounded-lg font-bold transition-all ${activeTab === 'settings' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
          style={{ color: activeTab === 'settings' ? COLORS.primary : undefined }}
        >
          <i className="fas fa-user-cog ml-2"></i> الإعدادات
        </button>
      </div>

      {activeTab === 'orders' ? (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
             <h3 className="text-2xl font-black" style={{ color: COLORS.primary }}>الطلبيات المستلمة</h3>
             <div className="bg-blue-50 px-4 py-2 rounded-lg text-sm font-bold text-blue-900 border border-blue-100">
               إجمالي الطلبات: {localSettings.orders.length}
             </div>
          </div>
          
          {localSettings.orders.length === 0 ? (
            <div className="py-24 text-center bg-white rounded-3xl border-4 border-dashed border-gray-100">
               <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                 <i className="fas fa-box-open text-3xl text-gray-300"></i>
               </div>
               <p className="text-gray-400 font-bold">لا توجد طلبيات مسجلة حتى الآن</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-gray-500 text-sm">
                    <th className="pr-6 py-2 text-right">العميل</th>
                    <th className="px-4 py-2 text-right">رقم الهاتف</th>
                    <th className="px-4 py-2 text-right">الفرع</th>
                    <th className="px-4 py-2 text-right">الطلبية</th>
                    <th className="px-4 py-2 text-right">الحالة</th>
                    <th className="px-4 py-2 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {localSettings.orders.map(order => (
                    <tr key={order.id} className="bg-white hover:bg-gray-50 transition-colors shadow-sm rounded-xl">
                      <td className="pr-6 py-5 rounded-r-2xl border-y border-r border-gray-100">
                        <div className="font-bold text-gray-900">{order.customerName}</div>
                        <div className="text-[10px] text-gray-400 mt-1">{order.timestamp}</div>
                      </td>
                      <td className="px-4 py-5 border-y border-gray-100">
                        <a href={`tel:${order.phone}`} className="text-blue-700 hover:underline font-bold text-sm">
                          {order.phone}
                        </a>
                      </td>
                      <td className="px-4 py-5 border-y border-gray-100">
                        <div className="text-sm font-semibold">{order.branch}</div>
                        <div className="text-[10px] text-gray-500 truncate max-w-[150px]">{order.address}</div>
                      </td>
                      <td className="px-4 py-5 border-y border-gray-100">
                        <div className="text-xs text-gray-600 line-clamp-2 max-w-[250px]" title={order.items}>
                          {order.items}
                        </div>
                      </td>
                      <td className="px-4 py-5 border-y border-gray-100">
                        <button 
                          onClick={() => toggleOrderStatus(order.id)}
                          className={`px-3 py-1 rounded-full text-[10px] font-black tracking-wide transition-all ${
                            order.status === 'جديد' 
                              ? 'bg-red-100 text-red-700 border border-red-200' 
                              : 'bg-green-100 text-green-700 border border-green-200'
                          }`}
                        >
                          {order.status}
                        </button>
                      </td>
                      <td className="px-4 py-5 rounded-l-2xl border-y border-l border-gray-100 text-center">
                        <div className="flex justify-center gap-2">
                          <button 
                            onClick={() => exportPDF(order)}
                            className="w-9 h-9 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                            title="تصدير فاتورة PDF"
                          >
                            <i className="fas fa-file-pdf"></i>
                          </button>
                          <button 
                            onClick={() => deleteOrder(order.id)}
                            className="w-9 h-9 flex items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-sm"
                            title="حذف الطلب"
                          >
                            <i className="fas fa-trash-alt"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fadeIn">
          {/* Security Settings */}
          <div className="space-y-6 bg-white p-8 rounded-2xl border-2 border-gray-50 shadow-sm">
            <h3 className="font-bold text-xl mb-6 flex items-center justify-end gap-3" style={{ color: COLORS.secondary }}>
               بيانات الدخول للإدارة <i className="fas fa-lock"></i>
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">اسم مستخدم جديد</label>
                <input 
                  type="text"
                  value={localSettings.adminUser}
                  onChange={(e) => setLocalSettings({...localSettings, adminUser: e.target.value})}
                  className={inputStyle}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">كلمة مرور جديدة</label>
                <input 
                  type="text"
                  value={localSettings.adminPass}
                  onChange={(e) => setLocalSettings({...localSettings, adminPass: e.target.value})}
                  className={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* Basic Settings */}
          <div className="space-y-6 bg-white p-8 rounded-2xl border-2 border-gray-50 shadow-sm">
            <h3 className="font-bold text-xl mb-6 flex items-center justify-end gap-3" style={{ color: COLORS.primary }}>
              إعدادات الترحيب والتواصل <i className="fas fa-bullhorn"></i>
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">رسالة الترحيب الافتراضية</label>
                <textarea 
                  rows={3}
                  value={localSettings.welcomeMessage}
                  onChange={(e) => setLocalSettings({...localSettings, welcomeMessage: e.target.value})}
                  className={inputStyle}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">رقم التواصل (الواتساب/الهاتف)</label>
                <input 
                  type="text"
                  value={localSettings.contactNumber}
                  onChange={(e) => setLocalSettings({...localSettings, contactNumber: e.target.value})}
                  className={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* AI Instructions */}
          <div className="col-span-1 lg:col-span-2 space-y-6 bg-white p-8 rounded-2xl border-2 border-gray-50 shadow-sm">
            <h3 className="font-bold text-xl mb-6 flex items-center justify-end gap-3" style={{ color: COLORS.primary }}>
              تعليمات الوكيل الذكي وقائمة الأسعار <i className="fas fa-robot"></i>
            </h3>
            <p className="text-sm text-gray-500 mb-4 bg-gray-50 p-4 rounded-lg border-r-4 border-blue-900">
              ملاحظة: تأكد من تحديث قائمة الأسعار هنا ليتمكن الوكيل من إخبار العملاء بها بدقة. الوكيل مبرمج حالياً لطلب الاسم والهاتف والفرع لتسجيل الطلبية.
            </p>
            <textarea 
              rows={15}
              value={localSettings.systemInstruction}
              onChange={(e) => setLocalSettings({...localSettings, systemInstruction: e.target.value})}
              className={`${inputStyle} font-mono text-xs md:text-sm leading-relaxed bg-gray-50`}
            />
          </div>

          <div className="col-span-1 lg:col-span-2 mt-8 flex justify-center pb-12">
            <button 
              onClick={handleSave}
              className="px-16 py-4 rounded-full text-white font-black text-xl transition-all hover:scale-105 active:scale-95 shadow-2xl hover:shadow-blue-900/20"
              style={{ backgroundColor: COLORS.primary }}
            >
              حفظ وتحديث النظام <i className="fas fa-save mr-3"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
