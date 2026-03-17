import React, { useState, useEffect } from 'react';
import { BarChart2, TrendingUp, AlertCircle, CheckCircle, ChevronRight, Zap, Target, FlaskConical, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, orderBy, limit, Timestamp, addDoc, serverTimestamp } from 'firebase/firestore';
import { EnemyMove, Experiment } from '../types';
import { getWeeklyInsights, getIdentityAlignment, getExperimentProposal } from '../services/geminiService';
import { handleFirestoreError, OperationType } from '../utils/error-handler';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Patterns() {
  const [moves, setMoves] = useState<EnemyMove[]>([]);
  const [insights, setInsights] = useState<{ insight: string; action: string }[]>([]);
  const [identityAlignment, setIdentityAlignment] = useState<any | null>(null);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [suggestedExperiment, setSuggestedExperiment] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    wins: 0,
    topTriggers: [] as { trigger: string; count: number }[],
    dailyCounts: [] as { date: string; count: number; impact: number }[]
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!auth.currentUser) return;
      setLoading(true);
      try {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        
        const q = query(
          collection(db, 'enemyMoves'),
          where('userId', '==', auth.currentUser.uid),
          where('createdAt', '>=', Timestamp.fromDate(weekAgo)),
          orderBy('createdAt', 'desc')
        );

        const snapshot = await getDocs(q);
        const fetchedMoves = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EnemyMove));
        setMoves(fetchedMoves);

        // Calculate stats
        const triggerCounts: Record<string, number> = {};
        const dailyData: Record<string, { count: number; impactSum: number }> = {};
        let wins = 0;

        fetchedMoves.forEach(move => {
          triggerCounts[move.trigger] = (triggerCounts[move.trigger] || 0) + 1;
          const date = move.date;
          if (!dailyData[date]) dailyData[date] = { count: 0, impactSum: 0 };
          dailyData[date].count += 1;
          dailyData[date].impactSum += move.impact;
          if (move.usedCounter) wins += 1;
        });

        const topTriggers = Object.entries(triggerCounts)
          .map(([trigger, count]) => ({ trigger, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 3);

        const dailyCounts = Object.entries(dailyData)
          .map(([date, data]) => ({
            date,
            count: data.count,
            impact: data.impactSum / data.count
          }))
          .sort((a, b) => a.date.localeCompare(b.date));

        setStats({
          total: fetchedMoves.length,
          wins,
          topTriggers,
          dailyCounts
        });

        // Get AI Insights
        if (fetchedMoves.length > 0) {
          const summary = `Total moves: ${fetchedMoves.length}, Wins: ${wins}, Top Triggers: ${topTriggers.map(t => t.trigger).join(', ')}`;
          
          // Parallel AI calls
          const [aiInsights, alignment, proposal] = await Promise.all([
            getWeeklyInsights(summary),
            (async () => {
              // Fetch active identity script
              const idQ = query(
                collection(db, 'identityScripts'),
                where('userId', '==', auth.currentUser.uid),
                where('active', '==', true),
                limit(1)
              );
              const idSnap = await getDocs(idQ);
              if (!idSnap.empty) {
                const script = idSnap.docs[0].data().text;
                return getIdentityAlignment(script, summary);
              }
              return null;
            })(),
            getExperimentProposal(summary)
          ]);

          setInsights(aiInsights);
          setIdentityAlignment(alignment);
          setSuggestedExperiment(proposal);
        }

        // Fetch existing experiments
        const expQ = query(
          collection(db, 'experiments'),
          where('userId', '==', auth.currentUser.uid),
          orderBy('createdAt', 'desc'),
          limit(3)
        );
        const expSnap = await getDocs(expQ);
        setExperiments(expSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Experiment)));

      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'enemyMoves');
      } finally {
        setLoading(true); // Wait, I should set it to false
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleStartExperiment = async () => {
    if (!auth.currentUser || !suggestedExperiment) return;
    try {
      await addDoc(collection(db, 'experiments'), {
        ...suggestedExperiment,
        userId: auth.currentUser.uid,
        status: 'active',
        createdAt: serverTimestamp()
      });
      // Refresh experiments
      const expQ = query(
        collection(db, 'experiments'),
        where('userId', '==', auth.currentUser.uid),
        orderBy('createdAt', 'desc'),
        limit(3)
      );
      const expSnap = await getDocs(expQ);
      setExperiments(expSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Experiment)));
      setSuggestedExperiment(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'experiments');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-white/40">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <BarChart2 size={32} />
        </motion.div>
        <p className="mt-4 text-xs font-bold uppercase tracking-widest">Scanning Patterns...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-24">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-white">Patterns</h1>
        <p className="text-white/40 font-medium">Weekly Radar</p>
      </header>

      <section className="bg-[#0d0f13] border border-white/5 rounded-3xl p-6 flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xs font-bold uppercase tracking-widest text-white/40">Weekly Overview</h2>
          <span className="text-xs font-bold text-[#3fd8ff]">{stats.total} Moves</span>
        </div>
        
        <div className="flex justify-between items-end h-24 gap-2">
          {Array.from({ length: 7 }).map((_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            const dateStr = date.toISOString().split('T')[0];
            const dayData = stats.dailyCounts.find(d => d.date === dateStr);
            const height = dayData ? Math.min(100, (dayData.count / 10) * 100) : 0;
            const intensity = dayData ? dayData.impact / 5 : 0;

            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full bg-white/5 rounded-t-lg relative overflow-hidden h-full">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    className={cn(
                      "absolute bottom-0 left-0 right-0 transition-colors",
                      intensity > 0.8 ? "bg-[#ff4b5c]" : intensity > 0.4 ? "bg-[#ff4b5c]/60" : "bg-[#ff4b5c]/30"
                    )}
                  />
                </div>
                <span className="text-[8px] font-bold text-white/20 uppercase">
                  {date.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0)}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4">
        <section className="bg-[#0d0f13] border border-white/5 rounded-3xl p-6 flex flex-col gap-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-white/40">Top Triggers</h2>
          <div className="flex flex-col gap-4">
            {stats.topTriggers.map((t, i) => (
              <div key={t.trigger} className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-white">{t.trigger}</span>
                  <span className="text-xs font-bold text-white/40">{t.count}</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(t.count / stats.total) * 100}%` }}
                    className="h-full bg-[#ff4b5c]"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-[#0d0f13] border border-white/5 rounded-3xl p-6 flex flex-col gap-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-white/40">Win vs Loss</h2>
          <div className="flex items-center gap-6">
            <div className="flex-1 flex flex-col gap-1">
              <span className="text-2xl font-bold text-[#3fd8ff]">{stats.wins}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 leading-tight">Applied Counter</span>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div className="flex-1 flex flex-col gap-1">
              <span className="text-2xl font-bold text-white/20">{stats.total - stats.wins}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 leading-tight">No Counter</span>
            </div>
          </div>
        </section>
      </div>

      {identityAlignment && (
        <section className="flex flex-col gap-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-white/40 px-1">Identity Alignment</h2>
          <div className="bg-[#0d0f13] border border-[#3fd8ff]/20 rounded-3xl p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Target size={16} className="text-[#3fd8ff]" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">Alignment Score</span>
              </div>
              <span className="text-xl font-bold text-[#3fd8ff]">{identityAlignment.alignmentScore}%</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${identityAlignment.alignmentScore}%` }}
                className="h-full bg-[#3fd8ff]"
              />
            </div>
            <p className="text-sm text-white/80 leading-relaxed italic">"{identityAlignment.analysis}"</p>
            <div className="p-4 bg-[#3fd8ff]/5 rounded-2xl border border-[#3fd8ff]/10">
              <p className="text-xs text-[#3fd8ff] font-bold uppercase tracking-widest mb-1">Advice</p>
              <p className="text-sm text-white/60">{identityAlignment.advice}</p>
            </div>
          </div>
        </section>
      )}

      {suggestedExperiment && (
        <section className="flex flex-col gap-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-white/40 px-1">New Experiment</h2>
          <div className="bg-[#0d0f13] border border-[#ff4b5c]/20 rounded-3xl p-6 flex flex-col gap-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <FlaskConical size={80} className="text-[#ff4b5c]" />
            </div>
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-[#ff4b5c]" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">{suggestedExperiment.title}</span>
            </div>
            <p className="text-sm text-white/80 leading-relaxed pr-12">{suggestedExperiment.hypothesis}</p>
            <div className="flex flex-col gap-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Action Step</p>
              <p className="text-sm font-bold text-white">{suggestedExperiment.action}</p>
            </div>
            <button
              onClick={handleStartExperiment}
              className="mt-2 w-full bg-[#ff4b5c] text-white py-3 rounded-xl font-bold uppercase text-xs tracking-widest shadow-lg shadow-[#ff4b5c]/20 active:scale-95 transition-transform"
            >
              Start Experiment
            </button>
          </div>
        </section>
      )}

      {experiments.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-white/40 px-1">Active Experiments</h2>
          <div className="flex flex-col gap-3">
            {experiments.map((exp) => (
              <div key={exp.id} className="bg-[#0d0f13] border border-white/5 rounded-2xl p-5 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">{exp.title}</span>
                  <span className={cn(
                    "text-[8px] font-bold uppercase tracking-widest px-2 py-1 rounded-full",
                    exp.status === 'active' ? "bg-[#3fd8ff]/10 text-[#3fd8ff]" : "bg-white/10 text-white/40"
                  )}>
                    {exp.status}
                  </span>
                </div>
                <p className="text-xs text-white/60 line-clamp-2">{exp.hypothesis}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {insights.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-white/40 px-1">AI Insights</h2>
          <div className="flex flex-col gap-3">
            {insights.map((insight, i) => (
              <div key={i} className="bg-[#0d0f13] border border-[#3fd8ff]/20 rounded-2xl p-5 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-[#3fd8ff]/10 rounded-lg text-[#3fd8ff]">
                    <Zap size={16} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-bold text-white leading-snug">{insight.insight}</p>
                    <p className="text-xs text-[#3fd8ff]/80 font-medium leading-relaxed">{insight.action}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
