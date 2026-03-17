import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Pin, Trash2, Edit2, ChevronRight, X, Save, Target, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy, onSnapshot, writeBatch } from 'firebase/firestore';
import { Script, IdentityScript } from '../types';
import { handleFirestoreError, OperationType } from '../utils/error-handler';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Scripts() {
  const [activeTab, setActiveTab] = useState<'battle' | 'identity'>('battle');
  const [scripts, setScripts] = useState<Script[]>([]);
  const [identityScripts, setIdentityScripts] = useState<IdentityScript[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newScript, setNewScript] = useState({ title: '', trigger: 'Phone', selfTalk: '', action: '' });
  const [newIdentity, setNewIdentity] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;
    setLoading(true);

    const q = query(
      collection(db, 'scripts'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedScripts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Script));
      setScripts(fetchedScripts);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'scripts');
    });

    // Identity Scripts listener
    const idQ = query(
      collection(db, 'identityScripts'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribeId = onSnapshot(idQ, (snapshot) => {
      setIdentityScripts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as IdentityScript)));
    });

    return () => {
      unsubscribe();
      unsubscribeId();
    };
  }, []);

  const handleTogglePin = async (script: Script) => {
    try {
      await updateDoc(doc(db, 'scripts', script.id), { pinned: !script.pinned });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `scripts/${script.id}`);
    }
  };

  const handleDelete = async (scriptId: string) => {
    try {
      await deleteDoc(doc(db, 'scripts', scriptId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `scripts/${scriptId}`);
    }
  };

  const handleSave = async () => {
    if (!auth.currentUser) return;

    if (activeTab === 'battle') {
      if (!newScript.title.trim()) return;
      try {
        await addDoc(collection(db, 'scripts'), {
          userId: auth.currentUser.uid,
          ...newScript,
          pinned: false,
          createdAt: serverTimestamp()
        });
        setIsAdding(false);
        setNewScript({ title: '', trigger: 'Phone', selfTalk: '', action: '' });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'scripts');
      }
    } else {
      if (!newIdentity.trim()) return;
      try {
        await addDoc(collection(db, 'identityScripts'), {
          userId: auth.currentUser.uid,
          text: newIdentity,
          active: identityScripts.length === 0, // First one is active by default
          createdAt: serverTimestamp()
        });
        setIsAdding(false);
        setNewIdentity('');
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'identityScripts');
      }
    }
  };

  const handleActivateIdentity = async (id: string) => {
    if (!auth.currentUser) return;
    try {
      const batch = writeBatch(db);
      identityScripts.forEach(s => {
        batch.update(doc(db, 'identityScripts', s.id), { active: s.id === id });
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'identityScripts');
    }
  };

  const handleDeleteIdentity = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'identityScripts', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `identityScripts/${id}`);
    }
  };

  const pinnedScripts = scripts.filter(s => s.pinned);
  const otherScripts = scripts.filter(s => !s.pinned);

  return (
    <div className="flex flex-col gap-8 pb-32">
      <header className="flex justify-between items-center">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight text-white">Scripts</h1>
          <p className="text-white/40 font-medium">Battle Library</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="p-3 bg-[#3fd8ff] text-black rounded-2xl shadow-lg shadow-[#3fd8ff]/20 active:scale-95 transition-transform"
        >
          <Plus size={24} strokeWidth={3} />
        </button>
      </header>

      <div className="flex bg-white/5 p-1 rounded-2xl">
        <button
          onClick={() => setActiveTab('battle')}
          className={cn(
            "flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
            activeTab === 'battle' ? "bg-white/10 text-white shadow-lg" : "text-white/40"
          )}
        >
          Battle Scripts
        </button>
        <button
          onClick={() => setActiveTab('identity')}
          className={cn(
            "flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
            activeTab === 'identity' ? "bg-white/10 text-white shadow-lg" : "text-white/40"
          )}
        >
          Identity Scripts
        </button>
      </div>

      {activeTab === 'battle' ? (
        <>
          {pinnedScripts.length > 0 && (
            <section className="flex flex-col gap-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-white/40 px-1">Pinned Scripts</h2>
              <div className="flex gap-4 overflow-x-auto pb-2 -mx-6 px-6 no-scrollbar">
                {pinnedScripts.map((script) => (
                  <div key={script.id} className="min-w-[280px] bg-[#0d0f13] border border-[#3fd8ff]/30 rounded-3xl p-6 flex flex-col gap-4 shadow-xl shadow-[#3fd8ff]/5">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-[#3fd8ff] uppercase tracking-wider">{script.title}</span>
                      <button onClick={() => handleTogglePin(script)} className="text-[#3fd8ff]">
                        <Pin size={16} fill="currentColor" />
                      </button>
                    </div>
                    <div className="flex flex-col gap-2">
                      <p className="text-sm font-bold text-white leading-snug line-clamp-2">{script.selfTalk}</p>
                      <p className="text-xs text-[#3fd8ff]/80 font-medium leading-relaxed line-clamp-2">{script.action}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="flex flex-col gap-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-white/40 px-1">All Scripts</h2>
            <div className="flex flex-col gap-3">
              {otherScripts.map((script) => (
                <div key={script.id} className="bg-[#0d0f13] border border-white/5 rounded-2xl p-5 flex flex-col gap-4 group">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">{script.title}</span>
                      <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{script.trigger}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleTogglePin(script)} className="p-2 text-white/20 hover:text-[#3fd8ff] transition-colors">
                        <Pin size={16} />
                      </button>
                      <button onClick={() => handleDelete(script.id)} className="p-2 text-white/20 hover:text-[#ff4b5c] transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-bold text-white/80 leading-snug line-clamp-1">{script.selfTalk}</p>
                    <p className="text-xs text-white/40 font-medium leading-relaxed line-clamp-1">{script.action}</p>
                  </div>
                </div>
              ))}
              {otherScripts.length === 0 && !loading && (
                <div className="py-12 text-center text-white/20">
                  <BookOpen size={48} className="mx-auto mb-4 opacity-10" />
                  <p className="text-xs font-bold uppercase tracking-widest">No scripts saved yet.</p>
                </div>
              )}
            </div>
          </section>
        </>
      ) : (
        <section className="flex flex-col gap-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-white/40 px-1">Core Identity</h2>
          <div className="flex flex-col gap-3">
            {identityScripts.map((script) => (
              <div 
                key={script.id} 
                className={cn(
                  "bg-[#0d0f13] border rounded-2xl p-5 flex flex-col gap-4 transition-all",
                  script.active ? "border-[#3fd8ff]/40 shadow-lg shadow-[#3fd8ff]/5" : "border-white/5 opacity-60"
                )}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <Target size={14} className={script.active ? "text-[#3fd8ff]" : "text-white/20"} />
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                      {script.active ? "Active Identity" : "Inactive"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {!script.active && (
                      <button 
                        onClick={() => handleActivateIdentity(script.id)}
                        className="p-2 text-white/20 hover:text-[#3fd8ff] transition-colors"
                      >
                        <CheckCircle2 size={16} />
                      </button>
                    )}
                    <button 
                      onClick={() => handleDeleteIdentity(script.id)}
                      className="p-2 text-white/20 hover:text-[#ff4b5c] transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <p className="text-lg font-bold text-white leading-tight italic">
                  "{script.text}"
                </p>
              </div>
            ))}
            {identityScripts.length === 0 && !loading && (
              <div className="py-12 text-center text-white/20">
                <Target size={48} className="mx-auto mb-4 opacity-10" />
                <p className="text-xs font-bold uppercase tracking-widest">Define your core identity.</p>
              </div>
            )}
          </div>
        </section>
      )}

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="fixed inset-0 bg-[#050608] z-[80] flex flex-col p-6 overflow-y-auto"
          >
            <header className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-white tracking-tight">
                {activeTab === 'battle' ? 'New Script' : 'New Identity'}
              </h2>
              <button onClick={() => setIsAdding(false)} className="p-2 bg-white/5 rounded-full text-white/40 hover:text-white/60 transition-colors">
                <X size={24} />
              </button>
            </header>

            <div className="flex flex-col gap-8 pb-32">
              {activeTab === 'battle' ? (
                <>
                  <section className="flex flex-col gap-3">
                    <label className="text-xs font-bold uppercase tracking-widest text-white/40 px-1">Title</label>
                    <input
                      type="text"
                      value={newScript.title}
                      onChange={(e) => setNewScript({ ...newScript, title: e.target.value })}
                      placeholder="e.g., Late Night Scroll"
                      className="w-full bg-[#0d0f13] border border-white/5 rounded-2xl p-4 text-white placeholder:text-white/20 focus:outline-none focus:border-[#3fd8ff]/50"
                    />
                  </section>

                  <section className="flex flex-col gap-3">
                    <label className="text-xs font-bold uppercase tracking-widest text-white/40 px-1">Self-Talk</label>
                    <textarea
                      value={newScript.selfTalk}
                      onChange={(e) => setNewScript({ ...newScript, selfTalk: e.target.value })}
                      placeholder="One sentence to neutralize the thought..."
                      className="w-full bg-[#0d0f13] border border-white/5 rounded-2xl p-4 text-white placeholder:text-white/20 focus:outline-none focus:border-[#3fd8ff]/50 min-h-[100px] resize-none"
                    />
                  </section>

                  <section className="flex flex-col gap-3">
                    <label className="text-xs font-bold uppercase tracking-widest text-white/40 px-1">Action</label>
                    <textarea
                      value={newScript.action}
                      onChange={(e) => setNewScript({ ...newScript, action: e.target.value })}
                      placeholder="One tiny physical action..."
                      className="w-full bg-[#0d0f13] border border-white/5 rounded-2xl p-4 text-white placeholder:text-white/20 focus:outline-none focus:border-[#3fd8ff]/50 min-h-[100px] resize-none"
                    />
                  </section>
                </>
              ) : (
                <section className="flex flex-col gap-3">
                  <label className="text-xs font-bold uppercase tracking-widest text-white/40 px-1">Identity Statement</label>
                  <textarea
                    value={newIdentity}
                    onChange={(e) => setNewIdentity(e.target.value)}
                    placeholder="e.g., I am the kind of person who never misses a workout."
                    className="w-full bg-[#0d0f13] border border-white/5 rounded-2xl p-4 text-white placeholder:text-white/20 focus:outline-none focus:border-[#3fd8ff]/50 min-h-[150px] resize-none text-lg font-medium italic"
                  />
                  <p className="text-[10px] text-white/20 font-medium px-1">
                    Research shows that defining yourself by your actions makes them easier to maintain.
                  </p>
                </section>
              )}
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#050608] via-[#050608] to-transparent">
              <button
                onClick={handleSave}
                disabled={activeTab === 'battle' ? !newScript.title.trim() : !newIdentity.trim()}
                className="w-full bg-[#3fd8ff] text-black py-5 rounded-2xl font-bold uppercase tracking-tight flex items-center justify-center gap-2 shadow-lg shadow-[#3fd8ff]/20 transition-transform active:scale-95 disabled:opacity-50"
              >
                <Save size={20} />
                Save {activeTab === 'battle' ? 'Script' : 'Identity'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
