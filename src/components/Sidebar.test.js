import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import Sidebar from './Sidebar';

global.IS_REACT_ACT_ENVIRONMENT = true;

describe('Sidebar brand title', () => {
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

  it('shows app title in Arabic only', () => {
    act(() => {
      root.render(
        <Sidebar
          activeView="dashboard"
          onViewChange={() => {}}
          user={{ username: 'admin', role: 'admin' }}
          onLogout={() => {}}
          stats={{ totalMessages: 10, totalSenders: 3 }}
          onShowLogin={() => {}}
        />
      );
    });

    expect(container.textContent).toContain('كونتابو');
    expect(container.textContent).not.toContain('Contaboo');
    expect(container.querySelector('.sidebar-logo')?.getAttribute('alt')).toBe('كونتابو');
  });
});
