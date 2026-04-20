import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import Login from './Login';
import InstallPrompt from './InstallPrompt';

global.IS_REACT_ACT_ENVIRONMENT = true;

describe('Login page updates', () => {
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

  it('shows Arabic app title only and uses username input label', () => {
    act(() => {
      root.render(<Login onLogin={() => {}} />);
    });

    expect(container.textContent).toContain('🏠 كونتابو');
    expect(container.textContent).not.toContain('Contaboo |');
    expect(container.textContent).not.toContain('نسيت كلمة المرور؟');
    expect(container.textContent).toContain('اسم المستخدم');
    const usernameInput = container.querySelector('#username');
    expect(usernameInput?.getAttribute('placeholder')).toBe('أدخل اسم المستخدم');
    expect(usernameInput?.getAttribute('dir')).toBeNull();
    expect(usernameInput?.getAttribute('style')).toBeNull();
  });
});

describe('Install prompt behavior', () => {
  let container;
  let root;
  const originalUserAgent = navigator.userAgent;
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();

    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn()
    }));

    Object.defineProperty(navigator, 'userAgent', {
      value: 'iPhone',
      configurable: true
    });

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();

    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      configurable: true
    });
    window.matchMedia = originalMatchMedia;
    jest.useRealTimers();
  });

  it('dismisses prompt without storing a long-term localStorage lockout', () => {
    act(() => {
      root.render(<InstallPrompt />);
    });

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    const closeButton = container.querySelector('.install-close');
    expect(closeButton).toBeTruthy();

    act(() => {
      closeButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(localStorage.getItem('pwaPromptDismissed')).toBeNull();
  });
});
