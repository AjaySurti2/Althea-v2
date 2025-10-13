import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Benefits } from './components/Benefits';
import { HowItWorks } from './components/HowItWorks';
import { Testimonials } from './components/Testimonials';
import { FAQ } from './components/FAQ';
import { Footer } from './components/Footer';
import { AuthModal } from './components/AuthModal';
import { ProfileModal } from './components/ProfileModal';
import { Dashboard } from './components/Dashboard';

function AppContent() {
  const { user } = useAuth();
  const [darkMode, setDarkMode] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'lead'>('signin');
  const [showDashboard, setShowDashboard] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  useEffect(() => {
    const isDark = localStorage.getItem('darkMode') === 'true';
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  useEffect(() => {
    if (window.location.hash === '#dashboard' && user) {
      setShowDashboard(true);
    } else {
      setShowDashboard(false);
    }

    const handleHashChange = () => {
      if (window.location.hash === '#dashboard' && user) {
        setShowDashboard(true);
      } else {
        setShowDashboard(false);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [user]);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', String(newMode));
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleAuthClick = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const handleLeadClick = () => {
    setAuthMode('lead');
    setAuthModalOpen(true);
  };

  const handleGetStarted = () => {
    if (user) {
      window.location.hash = '#dashboard';
    } else {
      setAuthMode('signup');
      setAuthModalOpen(true);
    }
  };

  const handleAuthRequired = () => {
    setAuthMode('signup');
    setAuthModalOpen(true);
  };

  if (showDashboard && user) {
    return (
      <div className={darkMode ? 'dark' : ''}>
        <Navbar
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode}
          onAuthClick={handleAuthClick}
          onLeadClick={handleLeadClick}
          onProfileClick={() => setProfileModalOpen(true)}
        />
        <Dashboard darkMode={darkMode} />
        <Footer darkMode={darkMode} />

        <ProfileModal
          isOpen={profileModalOpen}
          onClose={() => setProfileModalOpen(false)}
          darkMode={darkMode}
        />
      </div>
    );
  }

  return (
    <div className={darkMode ? 'dark' : ''}>
      <Navbar
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        onAuthClick={handleAuthClick}
        onLeadClick={handleLeadClick}
        onProfileClick={() => setProfileModalOpen(true)}
      />

      <Hero
        darkMode={darkMode}
        onGetStarted={handleGetStarted}
        onEarlyAccess={handleLeadClick}
      />

      <Benefits darkMode={darkMode} />

      <HowItWorks
        darkMode={darkMode}
        onAuthRequired={handleAuthRequired}
        onNavigateToDashboard={handleGetStarted}
      />

      <Testimonials darkMode={darkMode} />

      <FAQ darkMode={darkMode} />

      <Footer darkMode={darkMode} />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        mode={authMode}
        darkMode={darkMode}
      />

      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        darkMode={darkMode}
      />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
