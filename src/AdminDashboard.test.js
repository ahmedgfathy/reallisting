import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import AdminDashboard from './AdminDashboard';
import SettingsPage from './pages/SettingsPage';

global.IS_REACT_ACT_ENVIRONMENT = true;

describe('Admin dashboard single-user settings', () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('keeps import tools and shows duplicate-delete control in single-user mode', () => {
    act(() => {
      root.render(<AdminDashboard onClose={() => {}} onImportSuccess={() => {}} />);
    });

    expect(container.textContent).toContain('استيراد من واتساب');
    expect(container.textContent).not.toContain('اختبار اتصال الذكاء الاصطناعي');
    expect(container.textContent).not.toContain('تم إخفاء إدارة المستخدمين لأن النظام يعمل بحساب واحد فقط.');
    expect(container.textContent).not.toContain('تحديث القائمة');
    expect(container.textContent).toContain('حذف المكررات');
    expect(container.textContent).not.toContain('لا يوجد مستخدمين مسجلين حالياً.');
  });

  it('updates settings shortcut label to import and AI tools', () => {
    act(() => {
      root.render(
        <SettingsPage
          user={{ username: 'admin', role: 'admin', isActive: true }}
          isAdmin
          onShowAdminDashboard={() => {}}
        />
      );
    });

    expect(container.textContent).toContain('أدوات الاستيراد والذكاء الاصطناعي');
    expect(container.textContent).toContain('فتح أدوات الاستيراد والذكاء الاصطناعي');
    expect(container.textContent).not.toContain('فتح أدوات الاستيراد ولوحة التحكم');
  });
});
