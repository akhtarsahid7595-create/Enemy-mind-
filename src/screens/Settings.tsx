import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, LogOut, Trash2, Download, User, Shield, ChevronRight, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { auth, db, logOut } from '../firebase';
import { doc, getDoc, deleteDoc, collection, query, where, getDocs, writeBatch, updateDoc } from 'firebase/firestore';
import { UserProfile } from '../types';
import { handleFirestoreError, OperationType } from '../utils/error-handler';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Settings() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!auth.currentUser) return;
      try {
        const docRef = doc(db, 'users', auth.currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          setProfile(data);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${auth.currentUser.uid}`);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleClearData = async () => {
    if (!auth.currentUser || !window.confirm("Are you sure you want to clear all Enemy Moves and Scripts? This cannot be undone.")) return;
    
    try {
      const batch = writeBatch(db);
      
      const movesSnap = await getDocs(query(collection(db, 'enemyMoves'), where('userId', '==', auth.currentUser.uid)));
      movesSnap.forEach(doc => batch.delete(doc.ref));
      
      const scriptsSnap = await getDocs(query(collection(db, 'scripts'), where('userId', '==', auth.currentUser.uid)));
      scriptsSnap.forEach(doc => batch.delete(doc.ref));
      
      await batch.commit();
      alert("All data cleared successfully.");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'bulk-delete');
    }
  };

  const handleExport = async () => {
    if (!auth.currentUser) return;
    try {
      const movesSnap = await getDocs(query(collection(db, 'enemyMoves'), where('userId', '==', auth.currentUser.uid)));
      const moves = movesSnap.docs.map(doc => doc.data());
      
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(moves, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", "enemy_mind_export.json");
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'enemyMoves');
    }
  };
  
  const handleShowGuide = async () => {
    if (!auth.currentUser) return;
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, { hasCompletedOnboarding: false });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-24">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-white">Settings</h1>
        <p className="text-white/40 font-medium">Console Configuration</p>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-white/40 px-1">Profile</h2>
        <div className="bg-[#0d0f13] border border-white/5 rounded-3xl p-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-white/40">
            <User size={24} />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white">{auth.currentUser?.displayName || 'User'}</span>
            <span className="text-xs text-white/40">{auth.currentUser?.email}</span>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-white/40 px-1">Support</h2>
        <div className="bg-[#0d0f13] border border-white/5 rounded-3xl overflow-hidden">
          <button
            onClick={handleShowGuide}
            className="w-full p-6 flex items-center justify-between hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <HelpCircle size={20} className="text-[#3fd8ff]" />
              <span className="text-sm font-bold text-white">Watch App Guide</span>
            </div>
            <ChevronRight size={16} className="text-white/20" />
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-white/40 px-1">Data & Privacy</h2>
        <div className="bg-[#0d0f13] border border-white/5 rounded-3xl overflow-hidden">
          <button
            onClick={handleExport}
            className="w-full p-6 flex items-center justify-between hover:bg-white/5 transition-colors border-b border-white/5"
          >
            <div className="flex items-center gap-3">
              <Download size={20} className="text-white/40" />
              <span className="text-sm font-bold text-white">Export Data (JSON)</span>
            </div>
            <ChevronRight size={16} className="text-white/20" />
          </button>
          <button
            onClick={handleClearData}
            className="w-full p-6 flex items-center justify-between hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Trash2 size={20} className="text-[#ff4b5c]" />
              <span className="text-sm font-bold text-[#ff4b5c]">Clear All Data</span>
            </div>
            <ChevronRight size={16} className="text-white/20" />
          </button>
        </div>
      </section>

      <button
        onClick={() => logOut()}
        className="w-full mt-4 bg-white/5 hover:bg-white/10 text-white/60 py-5 rounded-2xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-colors"
      >
        <LogOut size={16} />
        Sign Out
      </button>
    </div>
  );
}
