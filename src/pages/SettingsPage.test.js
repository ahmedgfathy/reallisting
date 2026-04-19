import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import SettingsPage from './SettingsPage';

global.IS_REACT_ACT_ENVIRONMENT = true;

describe('SettingsPage', () => {
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

  it('opens import tools directly for admin users', () => {
    const onOpenImportTools = jest.fn();

    act(() => {
      root.render(
        <SettingsPage
          user={{ username: 'admin', role: 'admin', isActive: true }}
          isAdmin
          onOpenImportTools={onOpenImportTools}
        />
      );
    });

    expect(container.textContent).toContain('فتح أدوات الاستيراد');
    expect(container.textContent).not.toContain('فتح أدوات الاستيراد ولوحة التحكم');

    const importBtn = container.querySelector('.settings-admin-btn');
    act(() => {
      importBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onOpenImportTools).toHaveBeenCalledTimes(1);
  });
});
