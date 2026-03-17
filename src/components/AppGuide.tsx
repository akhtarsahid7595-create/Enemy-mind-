import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, Zap, Brain, Target, Activity, Shield, RefreshCw, BookOpen, AlertTriangle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AppGuideProps {
  onComplete: () => void;
}

const steps = [
  {
    title: "Welcome to Enemy Mind",
    description: "This is your tactical console for neutralizing self-sabotage. We treat negative thoughts and habits as an 'Enemy' that can be outsmarted.",
    icon: <Zap size={40} className="text-[#ff4b5c]" />,
    color: "text-[#ff4b5c]",
    bg: "bg-[#ff4b5c]/10"
  },
  {
    title: "Log Enemy Moves",
    description: "Whenever you feel an urge, a negative thought, or perform a self-sabotaging action, log it immediately. This brings the 'Enemy' into the light.",
    icon: <Brain size={40} className="text-[#3fd8ff]" />,
    color: "text-[#3fd8ff]",
    bg: "bg-[#3fd8ff]/10"
  },
  {
    title: "AI Counter-Moves",
    description: "For every move, our AI calculates a 'Counter-Move'. It gives you specific self-talk to neutralize the thought and a tiny physical action to break the loop.",
    icon: <RefreshCw size={40} className="text-emerald-400" />,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10"
  },
  {
    title: "Manipulation Shield",
    description: "The Enemy Mind uses tactics like rationalization and catastrophizing. The Shield feature detects these tactics and provides a 'Reality Check'.",
    icon: <Shield size={40} className="text-amber-400" />,
    color: "text-amber-400",
    bg: "bg-amber-400/10"
  },
  {
    title: "Identity & Scripts",
    description: "Define who you want to be with Identity Scripts. Save successful counter-moves as permanent Scripts to build your personal battle manual.",
    icon: <Target size={40} className="text-violet-400" />,
    color: "text-violet-400",
    bg: "bg-violet-400/10"
  },
  {
    title: "Panic Mode",
    description: "In high-stress moments, use Panic Mode for guided breathing, system-shock movements, or your top-pinned scripts to stay in control.",
    icon: <AlertTriangle size={40} className="text-[#ff4b5c]" />,
    color: "text-[#ff4b5c]",
    bg: "bg-[#ff4b5c]/10"
  }
];

export default function AppGuide({ onComplete }: AppGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 bg-[#050608]/95 z-[100] flex items-center justify-center p-6 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[#0d0f13] border border-white/10 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl shadow-black"
      >
        <div className="p-8 flex flex-col items-center text-center gap-6">
          <div className="flex justify-between w-full items-center mb-2">
            <div className="flex gap-1">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1 rounded-full transition-all duration-300",
                    i === currentStep ? "w-8 bg-[#3fd8ff]" : "w-2 bg-white/10"
                  )}
                />
              ))}
            </div>
            <button 
              onClick={onComplete}
              className="text-[10px] font-bold uppercase tracking-widest text-white/20 hover:text-white/40"
            >
              Skip
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col items-center gap-6"
            >
              <div className={cn("w-24 h-24 rounded-3xl flex items-center justify-center mb-2", steps[currentStep].bg)}>
                {steps[currentStep].icon}
              </div>
              
              <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  {steps[currentStep].title}
                </h2>
                <p className="text-white/60 leading-relaxed text-sm">
                  {steps[currentStep].description}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>

          <button
            onClick={nextStep}
            className="w-full mt-4 bg-white text-black py-5 rounded-2xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-[#3fd8ff] transition-colors active:scale-95"
          >
            {currentStep === steps.length - 1 ? "Start Training" : "Next"}
            <ChevronRight size={16} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
