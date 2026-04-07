import React from 'react';
import Sidebar from './Sidebar';
import MobileBottomNav from './MobileBottomNav';
import Header from './Header';
import './AppShell.css';

function AppShell({ children, activeView, onViewChange, user, onLogout, stats, isAuthenticated, onShowLogin, darkMode, onToggleDark }) {
  return (
    <div className={`app-shell${darkMode ? ' dark' : ''}`} data-theme={darkMode ? 'dark' : 'light'}>
      <aside className="app-sidebar">
        <Sidebar activeView={activeView} onViewChange={onViewChange} user={user} onLogout={onLogout} stats={stats} />
      </aside>
      <div className="app-main">
        <Header
          activeView={activeView}
          user={user}
          onLogout={onLogout}
          isAuthenticated={isAuthenticated}
          onShowLogin={onShowLogin}
          darkMode={darkMode}
          onToggleDark={onToggleDark}
        />
        <main className="app-content">
          {children}
        </main>
        <nav className="app-bottom-nav">
          <MobileBottomNav activeView={activeView} onViewChange={onViewChange} />
        </nav>
      </div>
    </div>
  );
}

export default AppShell;
