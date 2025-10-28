import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Benefits } from './components/Benefits';
import { HowItWorks } from './components/HowItWorks';
import { Testimonials } from './components/Testimonials';
import { FAQ } from './components/FAQ';
import { Footer } from './components/Footer';
import { AuthModal } from './components/AuthModal';
import { EnhancedProfileModal } from './components/EnhancedProfileModal';
import { Dashboard } from './components/Dashboard';
import { UploadWorkflow } from './components/UploadWorkflow';
import FamilyMembers from './components/FamilyMembers';
import FamilyPatterns from './components/FamilyPatterns';

function AppContent() {
  const { user } = useAuth();
  const [darkMode, setDarkMode] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'lead'>('signin');
  const [showDashboard, setShowDashboard] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [showWorkflow, setShowWorkflow] = useState(false);
  const [showFamilyMembers, setShowFamilyMembers] = useState(false);
  const [showFamilyPatterns, setShowFamilyPatterns] = useState(false);

  useEffect(() => {
    const isDark = localStorage.getItem('darkMode') === 'true';
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    if (user) {
      setShowDashboard(hash === '#dashboard');
      setShowFamilyMembers(hash === '#family-members');
      setShowFamilyPatterns(hash === '#family-patterns');
    } else {
      setShowDashboard(false);
      setShowFamilyMembers(false);
      setShowFamilyPatterns(false);
    }

    const handleHashChange = () => {
      const hash = window.location.hash;
      if (user) {
        setShowDashboard(hash === '#dashboard');
        setShowFamilyMembers(hash === '#family-members');
        setShowFamilyPatterns(hash === '#family-patterns');
      } else {
        setShowDashboard(false);
        setShowFamilyMembers(false);
        setShowFamilyPatterns(false);
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
      setShowWorkflow(true);
    } else {
      setAuthMode('signup');
      setAuthModalOpen(true);
    }
  };

  const handleAuthRequired = () => {
    setAuthMode('signup');
    setAuthModalOpen(true);
  };

  const handleStartWorkflow = () => {
    if (user) {
      setShowWorkflow(true);
    } else {
      handleAuthRequired();
    }
  };

  const handleWorkflowComplete = () => {
    setShowWorkflow(false);
  };

  if (showWorkflow && user) {
    return (
      <div className={darkMode ? 'dark' : ''}>
        <UploadWorkflow
          darkMode={darkMode}
          onComplete={handleWorkflowComplete}
          onCancel={handleWorkflowComplete}
        />
      </div>
    );
  }

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

        <EnhancedProfileModal
          isOpen={profileModalOpen}
          onClose={() => setProfileModalOpen(false)}
          darkMode={darkMode}
        />
      </div>
    );
  }

  if (showFamilyMembers && user) {
    return (
      <div className={darkMode ? 'dark' : ''}>
        <Navbar
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode}
          onAuthClick={handleAuthClick}
          onLeadClick={handleLeadClick}
          onProfileClick={() => setProfileModalOpen(true)}
        />
        <FamilyMembers />
        <Footer darkMode={darkMode} />

        <EnhancedProfileModal
          isOpen={profileModalOpen}
          onClose={() => setProfileModalOpen(false)}
          darkMode={darkMode}
        />
      </div>
    );
  }

  if (showFamilyPatterns && user) {
    return (
      <div className={darkMode ? 'dark' : ''}>
        <Navbar
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode}
          onAuthClick={handleAuthClick}
          onLeadClick={handleLeadClick}
          onProfileClick={() => setProfileModalOpen(true)}
        />
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 py-12">
          <FamilyPatterns />
        </div>
        <Footer darkMode={darkMode} />

        <EnhancedProfileModal
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
        onStartWorkflow={handleStartWorkflow}
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

      <EnhancedProfileModal
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
