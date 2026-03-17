import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { auth, signIn, db } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Shield, ChevronRight, AlertCircle } from 'lucide-react';
import Navigation from './components/Navigation';
import AppGuide from './components/AppGuide';
import Home from './screens/Home';
import Capture from './screens/Capture';
import CounterMoveScreen from './screens/CounterMove';
import Patterns from './screens/Patterns';
import Scripts from './screens/Scripts';
import Panic from './screens/Panic';
import Settings from './screens/Settings';
import { handleFirestoreError, OperationType } from './utils/error-handler';

// Error Boundary Component
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Something went wrong.";
      try {
        const parsed = JSON.parse(this.state.error?.message || '{}');
        if (parsed.error) errorMessage = parsed.error;
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-[#050608] flex flex-col items-center justify-center p-8 text-center">
          <div className="w-20 h-20 bg-[#ff4b5c]/10 rounded-full flex items-center justify-center text-[#ff4b5c] mb-6">
            <AlertCircle size={40} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">System Error</h2>
          <p className="text-white/60 mb-8 max-w-xs">{errorMessage}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-4 bg-[#ff4b5c] text-white rounded-2xl font-bold uppercase tracking-widest text-xs"
          >
            Reload Console
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const [isCapturing, setIsCapturing] = useState(false);
  const [activeMoveId, setActiveMoveId] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    let profileUnsubscribe: (() => void) | undefined;

    const authUnsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Ensure user profile exists in Firestore
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            await setDoc(userRef, {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName,
              createdAt: serverTimestamp(),
              hasCompletedOnboarding: false,
              role: 'user'
            });
          }

          // Listen to profile changes
          profileUnsubscribe = onSnapshot(userRef, (doc) => {
            if (doc.exists()) {
              const data = doc.data();
              if (data.hasCompletedOnboarding === false) {
                setShowGuide(true);
              } else {
                setShowGuide(false);
              }
            }
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${currentUser.uid}`);
        }
      } else {
        if (profileUnsubscribe) profileUnsubscribe();
      }
      setLoading(false);
    });

    return () => {
      authUnsubscribe();
      if (profileUnsubscribe) profileUnsubscribe();
    };
  }, []);

  const handleCompleteGuide = async () => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, { hasCompletedOnboarding: true }, { merge: true });
      setShowGuide(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050608] flex flex-col items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="text-[#ff4b5c]"
        >
          <Zap size={64} strokeWidth={3} />
        </motion.div>
        <span className="mt-8 text-[10px] font-bold uppercase tracking-[0.3em] text-white/20">Initializing Console</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#050608] flex flex-col p-8 overflow-hidden relative">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#ff4b5c]/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#3fd8ff]/10 rounded-full blur-[120px]" />
        
        <div className="flex-1 flex flex-col justify-center gap-12 relative z-10">
          <div className="flex flex-col gap-4">
            <div className="w-16 h-16 bg-[#ff4b5c] rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-[#ff4b5c]/40">
              <Zap size={32} strokeWidth={3} />
            </div>
            <h1 className="text-5xl font-bold tracking-tighter text-white leading-none">
              Enemy Mind<br />
              <span className="text-[#ff4b5c]">Console</span>
            </h1>
            <p className="text-lg text-white/40 font-medium max-w-[280px]">
              Neutralize self-sabotage. Capture moves. Win the inner war.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <button
              onClick={signIn}
              className="w-full bg-white text-black py-5 rounded-2xl font-bold uppercase tracking-tight flex items-center justify-center gap-3 shadow-xl transition-transform active:scale-95"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/action/google.svg" className="w-5 h-5" alt="Google" />
              Sign in with Google
            </button>
            <div className="flex items-center gap-2 justify-center text-[10px] font-bold uppercase tracking-widest text-white/20">
              <Shield size={12} />
              Secure Authentication
            </div>
          </div>
        </div>

        <footer className="py-8 text-center relative z-10">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/10">
            Companion to War Day Planner
          </p>
        </footer>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#050608] flex flex-col">
        <main className="flex-1 max-w-md mx-auto w-full p-6 pt-12">
          <AnimatePresence mode="wait">
            {activeTab === 'home' && (
              <motion.div
                key="home"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <Home onLogMove={() => setIsCapturing(true)} />
              </motion.div>
            )}
            {activeTab === 'patterns' && (
              <motion.div
                key="patterns"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <Patterns />
              </motion.div>
            )}
            {activeTab === 'scripts' && (
              <motion.div
                key="scripts"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <Scripts />
              </motion.div>
            )}
            {activeTab === 'panic' && (
              <motion.div
                key="panic"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <Panic />
              </motion.div>
            )}
            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <Settings />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

        <AnimatePresence>
          {showGuide && (
            <AppGuide onComplete={handleCompleteGuide} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isCapturing && (
            <Capture
              onClose={() => setIsCapturing(false)}
              onSuccess={(id) => {
                setIsCapturing(false);
                setActiveMoveId(id);
              }}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {activeMoveId && (
            <CounterMoveScreen
              moveId={activeMoveId}
              onClose={() => setActiveMoveId(null)}
              onSaveAsScript={() => {
                setActiveMoveId(null);
                setActiveTab('scripts');
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}
