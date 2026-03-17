import React, { useState, useEffect } from 'react';
import { Plus, ChevronRight, Brain, Zap, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { EnemyMove, EnemyMoveType } from '../types';
import { getCounterMove } from '../services/geminiService';
import { handleFirestoreError, OperationType } from '../utils/error-handler';

interface HomeProps {
  onLogMove: () => void;
}

export default function Home({ onLogMove }: HomeProps) {
  const [stats, setStats] = useState({ today: 0, wins: 0, total: 0 });
  const [recentMoves, setRecentMoves] = useState<EnemyMove[]>([]);

  useEffect(() => {
    if (!auth.currentUser) return;

    const today = new Date().toISOString().split('T')[0];
    const q = query(
      collection(db, 'enemyMoves'),
      where('userId', '==', auth.currentUser.uid),
      where('date', '==', today),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const moves = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EnemyMove));
      setRecentMoves(moves);
      setStats({
        today: moves.length,
        wins: moves.filter(m => m.usedCounter).length,
        total: moves.length
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'enemyMoves');
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="flex flex-col gap-8 pb-24">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-white">Console</h1>
        <p className="text-white/40 font-medium">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#0d0f13] border border-white/5 rounded-2xl p-4 flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Enemy Moves</span>
          <span className="text-2xl font-bold text-[#ff4b5c]">{stats.today}</span>
        </div>
        <div className="bg-[#0d0f13] border border-white/5 rounded-2xl p-4 flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Wins vs Enemy</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-[#3fd8ff]">{stats.wins}</span>
            <span className="text-sm text-white/20">/ {stats.total}</span>
          </div>
        </div>
      </div>

      <button
        onClick={onLogMove}
        className="w-full bg-[#ff4b5c] hover:bg-[#ff4b5c]/90 text-white py-6 rounded-3xl flex items-center justify-center gap-3 shadow-lg shadow-[#ff4b5c]/20 transition-transform active:scale-95"
      >
        <Plus size={28} strokeWidth={3} />
        <span className="text-xl font-bold uppercase tracking-tight">Log Enemy Move</span>
      </button>

      {recentMoves.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-white/40 px-1">Recent Skirmishes</h2>
          <div className="flex flex-col gap-3">
            {recentMoves.slice(0, 3).map((move) => (
              <div key={move.id} className="bg-[#0d0f13] border border-white/5 rounded-2xl p-4 flex items-center justify-between group">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-white/5 text-white/60">
                      {move.type}
                    </span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#ff4b5c]/10 text-[#ff4b5c]">
                      Impact {move.impact}
                    </span>
                  </div>
                  <p className="text-sm text-white/80 line-clamp-1">{move.description}</p>
                </div>
                <ChevronRight size={20} className="text-white/20 group-hover:text-white/40 transition-colors" />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
