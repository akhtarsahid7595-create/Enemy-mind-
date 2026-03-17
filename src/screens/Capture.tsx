import React, { useState } from 'react';
import { X, ChevronRight, Zap, Brain, Target, Activity, Clock, AlertTriangle, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { EnemyMoveType } from '../types';
import { getCounterMove } from '../services/geminiService';
import { handleFirestoreError, OperationType } from '../utils/error-handler';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CaptureProps {
  onClose: () => void;
  onSuccess: (moveId: string) => void;
}

const TRIGGERS = ['Phone', 'Social', 'Food', 'Boredom', 'Stress', 'People', 'Late Night', 'Other'];
const AREAS = ['Study', 'Money', 'Skill', 'Body', 'Mind', 'No link'];

export default function Capture({ onClose, onSuccess }: CaptureProps) {
  const [description, setDescription] = useState('');
  const [type, setType] = useState<EnemyMoveType>('thought');
  const [trigger, setTrigger] = useState('Phone');
  const [impact, setImpact] = useState(3);
  const [relatedArea, setRelatedArea] = useState('No link');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (getCounter: boolean) => {
    if (!auth.currentUser || !description.trim()) return;
    setIsSubmitting(true);

    try {
      const now = new Date();
      const moveData = {
        userId: auth.currentUser.uid,
        date: now.toISOString().split('T')[0],
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type,
        description,
        trigger,
        impact,
        relatedArea,
        usedCounter: false,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'enemyMoves'), moveData);
      
      if (getCounter) {
        onSuccess(docRef.id);
      } else {
        onClose();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'enemyMoves');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 bg-[#050608] z-[60] flex flex-col p-6 overflow-y-auto"
    >
      <header className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-white tracking-tight">Log Enemy Move</h2>
        <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-white/40 hover:text-white/60 transition-colors">
          <X size={24} />
        </button>
      </header>

      <div className="flex flex-col gap-8 pb-32">
        <section className="flex flex-col gap-3">
          <label className="text-xs font-bold uppercase tracking-widest text-white/40 px-1">What just happened?</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the thought, urge, or action..."
            className="w-full bg-[#0d0f13] border border-white/5 rounded-2xl p-4 text-white placeholder:text-white/20 focus:outline-none focus:border-[#ff4b5c]/50 min-h-[120px] resize-none"
          />
        </section>

        <section className="flex flex-col gap-3">
          <label className="text-xs font-bold uppercase tracking-widest text-white/40 px-1">Type</label>
          <div className="flex gap-2">
            {(['thought', 'urge', 'action'] as EnemyMoveType[]).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={cn(
                  "flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
                  type === t ? "bg-[#ff4b5c] text-white" : "bg-[#0d0f13] text-white/40 border border-white/5"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <label className="text-xs font-bold uppercase tracking-widest text-white/40 px-1">Trigger</label>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-6 px-6 no-scrollbar">
            {TRIGGERS.map((t) => (
              <button
                key={t}
                onClick={() => setTrigger(t)}
                className={cn(
                  "whitespace-nowrap px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
                  trigger === t ? "bg-white text-black" : "bg-[#0d0f13] text-white/40 border border-white/5"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <label className="text-xs font-bold uppercase tracking-widest text-white/40 px-1">Impact (1-5)</label>
          <div className="flex justify-between items-center bg-[#0d0f13] border border-white/5 rounded-2xl p-4">
            {[1, 2, 3, 4, 5].map((val) => (
              <button
                key={val}
                onClick={() => setImpact(val)}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                  impact === val ? "bg-[#ff4b5c] text-white scale-110 shadow-lg shadow-[#ff4b5c]/20" : "bg-white/5 text-white/40"
                )}
              >
                {val}
              </button>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <label className="text-xs font-bold uppercase tracking-widest text-white/40 px-1">Link to War Area</label>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-6 px-6 no-scrollbar">
            {AREAS.map((a) => (
              <button
                key={a}
                onClick={() => setRelatedArea(a)}
                className={cn(
                  "whitespace-nowrap px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
                  relatedArea === a ? "bg-[#3fd8ff] text-black" : "bg-[#0d0f13] text-white/40 border border-white/5"
                )}
              >
                {a}
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#050608] via-[#050608] to-transparent flex flex-col gap-3">
        <button
          onClick={() => handleSubmit(true)}
          disabled={isSubmitting || !description.trim()}
          className="w-full bg-[#ff4b5c] disabled:opacity-50 text-white py-5 rounded-2xl font-bold uppercase tracking-tight flex items-center justify-center gap-2 shadow-lg shadow-[#ff4b5c]/20 transition-transform active:scale-95"
        >
          {isSubmitting ? "Processing..." : "Save & Get Counter-Move"}
          <ChevronRight size={20} />
        </button>
        <button
          onClick={() => handleSubmit(false)}
          disabled={isSubmitting || !description.trim()}
          className="w-full bg-white/5 text-white/60 py-4 rounded-2xl font-bold uppercase tracking-wider text-xs transition-colors hover:bg-white/10"
        >
          Save Only
        </button>
      </div>
    </motion.div>
  );
}
