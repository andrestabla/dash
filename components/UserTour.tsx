"use client";

import { useState } from "react";
import { X, ChevronRight, ChevronLeft, Check } from "lucide-react";

interface Step {
    title: string;
    description: string;
    target?: string; // CSS selector if we want to highlight, though for now we'll do a simple modal tour
}

interface UserTourProps {
    steps: Step[];
    onComplete: () => void;
}

export default function UserTour({ steps, onComplete }: UserTourProps) {
    const [currentStep, setCurrentStep] = useState(0);

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            onComplete();
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="h-2 bg-gradient-to-r from-blue-500 to-purple-500" style={{ width: `${((currentStep + 1) / steps.length) * 100}%`, transition: 'width 0.3s ease' }} />

                <div className="p-8">
                    <div className="flex justify-between items-start mb-6">
                        <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase">
                            Paso {currentStep + 1} de {steps.length}
                        </div>
                        <button onClick={onComplete} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                        {steps[currentStep].title}
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-8">
                        {steps[currentStep].description}
                    </p>

                    <div className="flex items-center justify-between gap-4">
                        <button
                            onClick={handleBack}
                            disabled={currentStep === 0}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${currentStep === 0
                                    ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                        >
                            <ChevronLeft size={20} /> Atrás
                        </button>

                        <button
                            onClick={handleNext}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                        >
                            {currentStep === steps.length - 1 ? (
                                <>¡Entendido! <Check size={20} /></>
                            ) : (
                                <>Siguiente <ChevronRight size={20} /></>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
