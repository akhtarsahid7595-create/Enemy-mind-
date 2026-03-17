import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronRight, Zap, Brain, Target, Activity, Clock, AlertTriangle, Check, RefreshCw, Save, Volume2, Play, Pause, Square, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../firebase';
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp, query, where, limit, getDocs } from 'firebase/firestore';
import { EnemyMove, Script } from '../types';
import { getCounterMove, generateSpeech, playRawAudio, stopAudio, pcmToWav } from '../services/geminiService';
import { handleFirestoreError, OperationType } from '../utils/error-handler';
import AudioPlayer from '../components/AudioPlayer';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CounterMoveProps {
  moveId: string;
  onClose: () => void;
  onSaveAsScript: () => void;
}

export default function CounterMoveScreen({ moveId, onClose, onSaveAsScript }: CounterMoveProps) {
  const [move, setMove] = useState<EnemyMove | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isVoiceLoading, setIsVoiceLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [counter, setCounter] = useState<{ 
    selfTalk: string; 
    action: string;
    ifThenTrap?: { enemy: string; counter: string };
    shield?: { tactic: string; reality: string; betterThought: string };
  } | null>(null);
  const [identityScript, setIdentityScript] = useState<string | null>(null);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressInterval = useRef<number | null>(null);

  useEffect(() => {
    const fetchMoveAndCounter = async () => {
      if (!moveId) return;
      setLoading(true);
      try {
        const docRef = doc(db, 'enemyMoves', moveId);
        const docSnap = await getDoc(docRef);
        
        // Fetch identity script
        if (auth.currentUser) {
          const idQ = query(
            collection(db, 'identityScripts'),
            where('userId', '==', auth.currentUser.uid),
            where('active', '==', true),
            limit(1)
          );
          const idSnap = await getDocs(idQ);
          if (!idSnap.empty) {
            setIdentityScript(idSnap.docs[0].data().text);
          }
        }

        if (docSnap.exists()) {
          const moveData = { id: docSnap.id, ...docSnap.data() } as EnemyMove;
          setMove(moveData);

          if (moveData.counterTalk && moveData.ifThenTrap) {
            setCounter({
              selfTalk: moveData.counterTalk,
              action: moveData.counterAction || "",
              ifThenTrap: moveData.ifThenTrap,
              shield: moveData.shield
            });
          } else {
            // Get AI counter-move
            const aiCounter = await getCounterMove({
              type: moveData.type,
              description: moveData.description,
              trigger: moveData.trigger,
              impact: moveData.impact,
              relatedArea: moveData.relatedArea
            });
            setCounter(aiCounter);

            // Update move with counter
            await updateDoc(docRef, {
              counterTalk: aiCounter.selfTalk,
              counterAction: aiCounter.action,
              ifThenTrap: aiCounter.ifThenTrap,
              shield: aiCounter.shield
            });
          }
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `enemyMoves/${moveId}`);
      } finally {
        setLoading(false);
      }
    };

    fetchMoveAndCounter();

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (progressInterval.current) {
        window.clearInterval(progressInterval.current);
      }
    };
  }, [moveId]);

  const handleSpeak = async () => {
    if (!counter || isVoiceLoading) return;
    
    if (audioUrl) {
      // If we already have audio, we don't need to generate it again
      // The AudioPlayer handles its own playback
      return;
    }

    setIsVoiceLoading(true);
    try {
      const textToSpeak = `${counter.selfTalk}. Then, ${counter.action}`;
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

  const handleStopAudio = () => {
    setAudioUrl(null);
    setIsSpeaking(false);
  };

  const handleUseNow = async () => {
    if (!moveId) return;
    try {
      await updateDoc(doc(db, 'enemyMoves', moveId), {
        usedCounter: true
      });
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `enemyMoves/${moveId}`);
    }
  };

  const handleSaveAsScript = async () => {
    if (!auth.currentUser || !counter || !move) return;
    try {
      await addDoc(collection(db, 'scripts'), {
        userId: auth.currentUser.uid,
        title: move.trigger + " Counter",
        trigger: move.trigger,
        selfTalk: counter.selfTalk,
        action: counter.action,
        pinned: false,
        createdAt: serverTimestamp()
      });
      onSaveAsScript();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'scripts');
    }
  };

  const handleRegenerate = async () => {
    if (!move) return;
    setLoading(true);
    try {
      const aiCounter = await getCounterMove({
        type: move.type,
        description: move.description,
        trigger: move.trigger,
        impact: move.impact,
        relatedArea: move.relatedArea
      });
      setCounter(aiCounter);
      await updateDoc(doc(db, 'enemyMoves', moveId), {
        counterTalk: aiCounter.selfTalk,
        counterAction: aiCounter.action
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `enemyMoves/${moveId}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !counter) {
    return (
      <div className="fixed inset-0 bg-[#050608] z-[70] flex flex-col items-center justify-center p-6 text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="mb-8 text-[#ff4b5c]"
        >
          <Zap size={48} strokeWidth={3} />
        </motion.div>
        <h2 className="text-2xl font-bold text-white mb-2">Analyzing Enemy Move...</h2>
        <p className="text-white/40">Groq AI is calculating your counter-move.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-[#050608] z-[70] flex flex-col p-6 overflow-y-auto"
    >
      <header className="flex justify-between items-center mb-6">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#ff4b5c]">Battle Card</span>
          <h2 className="text-2xl font-bold text-white tracking-tight">Counter-Move</h2>
        </div>
        <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-white/40 hover:text-white/60 transition-colors">
          <X size={24} />
        </button>
      </header>

      {identityScript && (
        <div className="mb-6 bg-[#3fd8ff]/10 border border-[#3fd8ff]/20 rounded-xl p-3 flex items-center gap-3">
          <Target size={14} className="text-[#3fd8ff]" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#3fd8ff] line-clamp-1">
            Identity: {identityScript}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-6 pb-32">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Enemy Move</span>
          <p className="text-sm text-white/80 mt-1 line-clamp-2 italic">"{move?.description}"</p>
        </div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-[#0d0f13] border border-[#3fd8ff]/30 rounded-3xl p-8 flex flex-col gap-8 shadow-2xl shadow-[#3fd8ff]/10"
        >
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#3fd8ff]">Self-Talk</span>
            <div className="flex items-center gap-2 relative">
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
                  className="flex items-center gap-2 px-3 py-1.5 bg-[#3fd8ff]/10 text-[#3fd8ff] rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-[#3fd8ff]/20 transition-colors"
                >
                  <Volume2 size={14} />
                  Listen
                </button>
              )}
              {audioUrl && (
                <button
                  onClick={handleStopAudio}
                  className="p-2 bg-white/5 text-white/40 rounded-lg hover:text-[#ff4b5c] transition-all active:scale-90"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <p className="text-2xl font-bold text-white leading-tight">
              {counter?.selfTalk}
            </p>
            
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
            <p className="text-xl font-medium text-[#3fd8ff] leading-snug">
              {counter?.action}
            </p>
          </div>
        </motion.div>

        {counter?.shield && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-[#0d0f13] border border-[#ff4b5c]/20 rounded-2xl p-6 flex flex-col gap-4"
          >
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-[#ff4b5c]" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#ff4b5c]">Manipulation Shield</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase text-white/20">Enemy Tactic</span>
              <p className="text-sm font-bold text-white">{counter.shield.tactic}</p>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase text-white/20">Reality Check</span>
              <p className="text-sm text-white/80">{counter.shield.reality}</p>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase text-white/20">Better Thought</span>
              <p className="text-sm text-[#3fd8ff] font-medium italic">"{counter.shield.betterThought}"</p>
            </div>
          </motion.div>
        )}

        {counter?.ifThenTrap && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-[#0d0f13] border border-white/5 rounded-2xl p-6 flex flex-col gap-4"
          >
            <div className="flex items-center gap-2">
              <RefreshCw size={16} className="text-white/40" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">If-Then Trap</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase text-[#ff4b5c]/60">Enemy If-Then</span>
              <p className="text-sm text-white/80">{counter.ifThenTrap.enemy}</p>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase text-[#3fd8ff]/60">Counter If-Then</span>
              <p className="text-sm text-white/80 font-bold">{counter.ifThenTrap.counter}</p>
            </div>
          </motion.div>
        )}

        <button
          onClick={() => setShowMoreOptions(!showMoreOptions)}
          className="text-center text-xs font-bold uppercase tracking-widest text-white/20 hover:text-white/40 transition-colors py-2"
        >
          {showMoreOptions ? "Hide Options" : "More Options"}
        </button>

        <AnimatePresence>
          {showMoreOptions && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="flex flex-col gap-3 overflow-hidden"
            >
              <button
                onClick={handleRegenerate}
                className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-white/5 text-white/60 text-sm font-bold uppercase tracking-wider hover:bg-white/10 transition-colors"
              >
                <RefreshCw size={16} />
                Give Another Option
              </button>
              <button
                onClick={handleSaveAsScript}
                className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-white/5 text-white/60 text-sm font-bold uppercase tracking-wider hover:bg-white/10 transition-colors"
              >
                <Save size={16} />
                Save as Script
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#050608] via-[#050608] to-transparent">
        <button
          onClick={handleUseNow}
          className="w-full bg-[#3fd8ff] text-black py-5 rounded-2xl font-bold uppercase tracking-tight flex items-center justify-center gap-2 shadow-lg shadow-[#3fd8ff]/20 transition-transform active:scale-95"
        >
          <Check size={24} strokeWidth={3} />
          Use This Now
        </button>
      </div>
    </motion.div>
  );
}
