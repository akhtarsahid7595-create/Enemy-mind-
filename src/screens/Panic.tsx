import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Wind, Activity, BookOpen, ChevronRight, Zap, RefreshCw, Volume2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { Script } from '../types';
import { handleFirestoreError, OperationType } from '../utils/error-handler';
import { generateSpeech, playRawAudio, stopAudio, pcmToWav } from '../services/geminiService';
import AudioPlayer from '../components/AudioPlayer';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Panic() {
  const [mode, setMode] = useState<'none' | 'breathe' | 'move' | 'script'>('none');
  const [pinnedScript, setPinnedScript] = useState<Script | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceGuidance, setVoiceGuidance] = useState(true);
  const [isVoiceLoading, setIsVoiceLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [breathePhase, setBreathePhase] = useState<'in' | 'hold' | 'out' | 'hold2'>('in');
  const [timer, setTimer] = useState(6);
  const nextAudioRef = useRef<string | null>(null);
  const isPreFetchingRef = useRef(false);

  useEffect(() => {
    const fetchPinned = async () => {
      if (!auth.currentUser) return;
      try {
        const q = query(
          collection(db, 'scripts'),
          where('userId', '==', auth.currentUser.uid),
          where('pinned', '==', true),
          limit(1)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          setPinnedScript({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Script);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'scripts');
      }
    };
    fetchPinned();
  }, []);

  const handleSpeak = async () => {
    if (!pinnedScript || isVoiceLoading) return;
    
    if (audioUrl) {
      return;
    }

    setIsVoiceLoading(true);
    try {
      const textToSpeak = `${pinnedScript.selfTalk}. Then, ${pinnedScript.action}`;
      const base64Audio = await generateSpeech(textToSpeak);
      if (base64Audio) {
        const url = pcmToWav(base64Audio);
        setAudioUrl(url);
      }
    } catch (error) {
      console.error("Speech error:", error);
    } finally {
      setIsVoiceLoading(false);
    }
  };

  useEffect(() => {
    if (mode !== 'breathe') {
      nextAudioRef.current = null;
      return;
    }

    const getPhaseText = (phase: string) => {
      if (phase === 'in') return "Slowly breathe in. Feel the air filling your lungs.";
      if (phase === 'out') return "Now, slowly breathe out. Release all the tension.";
      return "Hold. Stay calm and still.";
    };

    const preFetchNext = async (currentPhase: string) => {
      if (!voiceGuidance || isPreFetchingRef.current) return;
      
      let nextPhase = '';
      if (currentPhase === 'in') nextPhase = 'hold';
      else if (currentPhase === 'hold') nextPhase = 'out';
      else if (currentPhase === 'out') nextPhase = 'hold2';
      else nextPhase = 'in';

      isPreFetchingRef.current = true;
      try {
        const text = getPhaseText(nextPhase);
        const base64 = await generateSpeech(text, 'calm');
        nextAudioRef.current = base64 || null;
      } catch (e) {
        console.error("Pre-fetch error", e);
      } finally {
        isPreFetchingRef.current = false;
      }
    };

    const playCurrent = async () => {
      if (!voiceGuidance) return;
      
      if (nextAudioRef.current) {
        await playRawAudio(nextAudioRef.current);
        nextAudioRef.current = null;
      } else {
        // Fallback if not pre-fetched
        setIsVoiceLoading(true);
        try {
          const text = getPhaseText(breathePhase);
          const base64 = await generateSpeech(text, 'calm');
          if (base64) await playRawAudio(base64);
        } catch (e) {
          console.error("Breathe speech error", e);
        } finally {
          setIsVoiceLoading(false);
        }
      }
      
      // After playing, pre-fetch the next one
      preFetchNext(breathePhase);
    };

    playCurrent();

    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          setBreathePhase((current) => {
            let next = '';
            if (current === 'in') next = 'hold';
            else if (current === 'hold') next = 'out';
            else if (current === 'out') next = 'hold2';
            else next = 'in';
            return next as any;
          });
          return 6;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      stopAudio();
    };
  }, [mode, breathePhase, voiceGuidance]);

  const renderBreathe = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center gap-12 py-12 relative overflow-hidden"
    >
      {/* Meditative Background Pulse */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.05, 0.1, 0.05],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute inset-0 bg-gradient-to-b from-[#3fd8ff]/10 to-transparent rounded-full blur-[120px] -z-10"
      />

      <div className="relative flex items-center justify-center">
        <motion.div
          animate={{
            scale: breathePhase === 'in' ? 1.8 : breathePhase === 'out' ? 1 : 1.8,
            opacity: breathePhase === 'in' ? 0.3 : breathePhase === 'out' ? 0.05 : 0.3
          }}
          transition={{ duration: 6, ease: "easeInOut" }}
          className="absolute w-48 h-48 bg-[#3fd8ff] rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: breathePhase === 'in' ? 1.3 : breathePhase === 'out' ? 0.7 : 1.3,
          }}
          transition={{ duration: 6, ease: "easeInOut" }}
          className="w-32 h-32 border-2 border-[#3fd8ff]/30 rounded-full flex items-center justify-center relative"
        >
          <motion.div 
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 border border-[#3fd8ff]/20 rounded-full"
          />
          <span className="text-5xl font-light text-white tabular-nums">{timer}</span>
        </motion.div>
      </div>
      
      <div className="flex flex-col items-center gap-3">
        <AnimatePresence mode="wait">
          <motion.h3 
            key={breathePhase}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-3xl font-light text-white tracking-[0.2em] uppercase"
          >
            {breathePhase === 'in' ? 'Breathe In' : breathePhase === 'hold' || breathePhase === 'hold2' ? 'Hold' : 'Breathe Out'}
          </motion.h3>
        </AnimatePresence>
        <div className="flex items-center gap-2">
          <div className="w-1 h-1 bg-[#3fd8ff] rounded-full animate-pulse" />
          <p className="text-[#3fd8ff]/60 text-[10px] font-bold uppercase tracking-[0.3em]">Calm Mode Active</p>
        </div>
      </div>

      <button
        onClick={() => {
          setMode('none');
          stopAudio();
        }}
        className="mt-8 px-8 py-4 bg-white/5 rounded-2xl text-white/40 text-xs font-bold uppercase tracking-widest hover:bg-white/10"
      >
        Stop Session
      </button>
    </motion.div>
  );

  const renderMove = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-8 py-12"
    >
      <div className="bg-[#0d0f13] border border-[#ff4b5c]/30 rounded-3xl p-8 flex flex-col gap-6 text-center">
        <div className="w-16 h-16 bg-[#ff4b5c]/10 rounded-full flex items-center justify-center text-[#ff4b5c] mx-auto">
          <Activity size={32} />
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="text-2xl font-bold text-white">Shock the System</h3>
          <p className="text-white/60 leading-relaxed">The Enemy Mind thrives on stillness. Break the loop with movement.</p>
        </div>
        <div className="bg-white/5 rounded-2xl p-6 flex flex-col gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#ff4b5c]">Suggested Action</span>
          <p className="text-lg font-bold text-white">Do 20 explosive air squats or pushups right now.</p>
        </div>
      </div>
      <button
        onClick={() => setMode('none')}
        className="w-full py-5 bg-[#ff4b5c] text-white rounded-2xl font-bold uppercase tracking-tight shadow-lg shadow-[#ff4b5c]/20"
      >
        I'm Moving Now
      </button>
    </motion.div>
  );

  const renderScript = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-8 py-12"
    >
      {pinnedScript ? (
        <div className="bg-[#0d0f13] border border-[#3fd8ff]/30 rounded-3xl p-8 flex flex-col gap-8 shadow-2xl shadow-[#3fd8ff]/10">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#3fd8ff]">Self-Talk</span>
            <div className="flex items-center gap-2">
              {isVoiceLoading && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-[#3fd8ff] border-t-transparent rounded-full"
                />
              )}
              {!audioUrl && !isVoiceLoading && (
                <button
                  onClick={handleSpeak}
                  className="p-2 text-white/20 hover:text-white/40 transition-colors"
                >
                  <Volume2 size={20} />
                </button>
              )}
              {audioUrl && (
                <button
                  onClick={() => setAudioUrl(null)}
                  className="p-2 text-white/20 hover:text-[#ff4b5c] transition-colors"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-6">
            <p className="text-2xl font-bold text-white leading-tight">{pinnedScript.selfTalk}</p>
            {audioUrl && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <AudioPlayer src={audioUrl} className="bg-white/5 border-white/10" />
              </motion.div>
            )}
          </div>
          <div className="h-px bg-white/10 w-full" />
          <div className="flex flex-col gap-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#3fd8ff]">Action</span>
            <p className="text-xl font-medium text-[#3fd8ff] leading-snug">{pinnedScript.action}</p>
          </div>
        </div>
      ) : (
        <div className="bg-[#0d0f13] border border-white/5 rounded-3xl p-8 text-center flex flex-col gap-4">
          <BookOpen size={48} className="mx-auto text-white/10" />
          <p className="text-white/40 text-sm">No pinned scripts found. Save a counter-move as a script first.</p>
        </div>
      )}
      <button
        onClick={() => {
          setMode('none');
          stopAudio();
        }}
        className="w-full py-5 bg-white/5 text-white/40 rounded-2xl font-bold uppercase tracking-widest text-xs"
      >
        Back to Panic Menu
      </button>
    </motion.div>
  );

  return (
    <div className="flex flex-col gap-8 pb-24">
      <header className="flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight text-[#ff4b5c]">Panic</h1>
          <p className="text-white/40 font-medium">Enemy Mind Spike</p>
        </div>
        <button 
          onClick={() => setVoiceGuidance(!voiceGuidance)}
          className={cn(
            "p-3 rounded-2xl transition-all flex items-center gap-2 relative",
            voiceGuidance ? "bg-[#3fd8ff]/10 text-[#3fd8ff]" : "bg-white/5 text-white/20"
          )}
        >
          {isVoiceLoading && voiceGuidance && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="absolute -top-1 -right-1 w-3 h-3 bg-[#3fd8ff] rounded-full border-2 border-[#050608]"
            />
          )}
          <Volume2 size={20} />
          <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">
            {voiceGuidance ? 'Voice On' : 'Voice Off'}
          </span>
        </button>
      </header>

      <AnimatePresence mode="wait">
        {mode === 'none' ? (
          <motion.div
            key="menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-4"
          >
            <p className="text-white/60 text-sm mb-4">Choose one move for the next 2 minutes.</p>
            
            <button
              onClick={() => setMode('breathe')}
              className="group bg-[#0d0f13] border border-white/5 hover:border-[#3fd8ff]/30 rounded-3xl p-8 flex items-center gap-6 transition-all active:scale-95"
            >
              <div className="w-16 h-16 bg-[#3fd8ff]/10 rounded-full flex items-center justify-center text-[#3fd8ff] group-hover:scale-110 transition-transform">
                <Wind size={32} />
              </div>
              <div className="flex flex-col items-start gap-1">
                <span className="text-xl font-bold text-white">Breathe</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/20">6-6-6-6 Calm Breathing</span>
              </div>
            </button>

            <button
              onClick={() => setMode('move')}
              className="group bg-[#0d0f13] border border-white/5 hover:border-[#ff4b5c]/30 rounded-3xl p-8 flex items-center gap-6 transition-all active:scale-95"
            >
              <div className="w-16 h-16 bg-[#ff4b5c]/10 rounded-full flex items-center justify-center text-[#ff4b5c] group-hover:scale-110 transition-transform">
                <Activity size={32} />
              </div>
              <div className="flex flex-col items-start gap-1">
                <span className="text-xl font-bold text-white">Move</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/20">Physical System Shock</span>
              </div>
            </button>

            <button
              onClick={() => setMode('script')}
              className="group bg-[#0d0f13] border border-white/5 hover:border-[#3fd8ff]/30 rounded-3xl p-8 flex items-center gap-6 transition-all active:scale-95"
            >
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center text-white/40 group-hover:scale-110 transition-transform">
                <BookOpen size={32} />
              </div>
              <div className="flex flex-col items-start gap-1">
                <span className="text-xl font-bold text-white">Script</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/20">Top Pinned Counter</span>
              </div>
            </button>
          </motion.div>
        ) : mode === 'breathe' ? (
          <div key="breathe">{renderBreathe()}</div>
        ) : mode === 'move' ? (
          <div key="move">{renderMove()}</div>
        ) : (
          <div key="script">{renderScript()}</div>
        )}
      </AnimatePresence>
    </div>
  );
}
