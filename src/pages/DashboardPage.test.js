import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import DashboardPage from './DashboardPage';

global.IS_REACT_ACT_ENVIRONMENT = true;

describe('DashboardPage', () => {
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

  it('hides removed cards and settings quick action', () => {
    act(() => {
      root.render(
        <DashboardPage
          stats={{ totalMessages: 12, totalSenders: 7 }}
          messages={[]}
          user={{ username: 'admin', role: 'admin' }}
          onViewChange={() => {}}
          isUserActive
        />
      );
    });

    expect(container.textContent).toContain('إجمالي العقارات');
    expect(container.textContent).toContain('المرسلون');
    expect(container.textContent).toContain('عرض العقارات');
    expect(container.textContent).toContain('عرض العملاء المحتملين');

    expect(container.textContent).not.toContain('المشتركون');
    expect(container.textContent).not.toContain('الملفات المستوردة');
    expect(container.textContent).not.toContain('الإعدادات');
  });
});
