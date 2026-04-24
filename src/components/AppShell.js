import React from 'react';
import Sidebar from './Sidebar';
import MobileBottomNav from './MobileBottomNav';
import Header from './Header';
import './AppShell.css';

function AppShell({
  children,
  activeView,
  onViewChange,
  user,
  onLogout,
  stats,
  isAuthenticated,
  onShowLogin,
  isPublicLayout = false
}) {
  return (
    <div className={`app-shell${isPublicLayout ? ' public-layout' : ''}`} data-theme="brand">
      {!isPublicLayout && (
        <aside className="app-sidebar">
          <Sidebar
            activeView={activeView}
            onViewChange={onViewChange}
            user={user}
            onLogout={onLogout}
            stats={stats}
            onShowLogin={onShowLogin}
          />
        </aside>
      )}
      <div className={`app-main${isPublicLayout ? ' public-layout' : ''}`}>
        {!isPublicLayout && (
          <Header
            activeView={activeView}
            user={user}
            onLogout={onLogout}
            isAuthenticated={isAuthenticated}
            onShowLogin={onShowLogin}
          />
        )}
        <main className={`app-content${isPublicLayout ? ' public-layout' : ''}`}>
          {children}
        </main>
        {!isPublicLayout && (
          <nav className="app-bottom-nav">
            <MobileBottomNav activeView={activeView} onViewChange={onViewChange} />
          </nav>
        )}
      </div>
    </div>
  );
}

export default AppShell;
