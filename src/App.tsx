/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  Lightbulb, 
  ChevronRight, 
  Trophy,
  Info,
  Delete,
  GraduationCap
} from 'lucide-react';
import { Token, Task, FractionToken } from './types';
import { INITIAL_TASKS } from './constants';
import { getTeacherHint } from './services/teacherService';

// --- Utility Components ---

const FractionDisplay: React.FC<{ numerator: string | number; denominator: string | number; size?: 'sm' | 'md' }> = ({ 
  numerator, 
  denominator,
  size = 'md'
}) => {
  const fontSize = size === 'sm' ? 'text-sm' : 'text-lg';
  const padding = size === 'sm' ? 'py-1' : 'py-2';

  return (
    <div className={`flex flex-col items-center justify-center leading-none ${fontSize} ${padding} px-4 font-mono font-medium`}>
      <div className="pb-1 border-b-2 border-current w-full text-center">
        {numerator}
      </div>
      <div className="pt-1 w-full text-center">
        {denominator}
      </div>
    </div>
  );
};

interface TokenItemProps {
  token: Token;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  disabled?: boolean;
  onSlotClick?: (slot: 'numerator' | 'denominator') => void;
}

const TokenItem = React.forwardRef<HTMLDivElement, TokenItemProps>(({ token, onClick, className = '', disabled, onSlotClick }, ref) => {
  const baseStyles = "relative flex items-center justify-center rounded-xl transition-all duration-200 cursor-pointer select-none active:scale-95";
  
  let content;
  let appearance;

  switch (token.type) {
    case 'number':
      content = <span className="font-mono text-xl">{token.value}</span>;
      appearance = "bg-white border-2 border-slate-200 text-slate-800 shadow-sm hover:border-slate-400";
      break;
    case 'operator':
      content = <span className="font-mono text-2xl font-bold">{token.value === '*' ? '×' : token.value === '/' ? '÷' : token.value}</span>;
      appearance = "bg-indigo-50 border-2 border-indigo-200 text-indigo-700 shadow-sm hover:bg-indigo-100 hover:border-indigo-300";
      break;
    case 'fraction':
      content = (
        <div className="flex flex-col items-center justify-center leading-none text-lg py-1 px-4 font-mono font-medium">
          <div 
            onClick={(e) => { e.stopPropagation(); onSlotClick?.('numerator'); }}
            className={`pb-1 border-b-2 border-current w-full text-center min-w-[30px] min-h-[1.5em] transition-colors ${token.selectedSlot === 'numerator' ? 'bg-teal-200 rounded' : 'hover:bg-teal-100'}`}
          >
            {token.numerator ?? '?'}
          </div>
          <div 
            onClick={(e) => { e.stopPropagation(); onSlotClick?.('denominator'); }}
            className={`pt-1 w-full text-center min-w-[30px] min-h-[1.5em] transition-colors ${token.selectedSlot === 'denominator' ? 'bg-teal-200 rounded' : 'hover:bg-teal-100'}`}
          >
            {token.denominator ?? '?'}
          </div>
        </div>
      );
      appearance = "bg-teal-50 border-2 border-teal-200 text-teal-800 shadow-sm";
      break;
    case 'variable':
      content = <span className="font-bold italic text-xl px-4">{token.value}</span>;
      appearance = "bg-amber-50 border-2 border-amber-200 text-amber-800 shadow-sm hover:bg-amber-100 hover:border-amber-300";
      break;
  }

  return (
    <motion.div 
      ref={ref}
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={!disabled && token.type !== 'fraction' ? { y: -2 } : {}}
      onClick={!disabled ? onClick : undefined}
      className={`${baseStyles} ${appearance} ${className} ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
    >
      {content}
    </motion.div>
  );
});

TokenItem.displayName = 'TokenItem';

// --- Math Evaluation ---

const evaluateExpression = (tokens: Token[], xValue?: number): number | { left: number; right: number } | null => {
  try {
    const parts = tokens.map(t => {
      if (t.type === 'number') return t.value.toString();
      if (t.type === 'operator') return t.value;
      if (t.type === 'fraction') {
        if (t.numerator === null || t.denominator === null) throw new Error('Incomplete fraction');
        return `((${t.numerator})/(${t.denominator}))`;
      }
      if (t.type === 'variable') return xValue !== undefined ? xValue.toString() : 'NaN';
      return '';
    });

    const fullExpr = parts.join('');
    if (!fullExpr) return null;

    if (fullExpr.includes('=')) {
      const [leftSide, rightSide] = fullExpr.split('=');
      if (!leftSide || !rightSide) return null;
      // eslint-disable-next-line no-eval
      return { left: eval(leftSide), right: eval(rightSide) };
    }

    // eslint-disable-next-line no-eval
    return eval(fullExpr);
  } catch (e) {
    return null;
  }
};

// --- Main App Component ---

export default function App() {
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [workspaceTokens, setWorkspaceTokens] = useState<(Token & { id: string })[]>([]);
  const [availableTokens, setAvailableTokens] = useState<(Token & { id: string })[]>([]);
  const [feedback, setFeedback] = useState<{ status: 'correct' | 'wrong' | 'idle'; message: string }>({ status: 'idle', message: '' });
  const [showHint, setShowHint] = useState(false);
  const [activeFractionId, setActiveFractionId] = useState<string | null>(null);
  const [calculationResult, setCalculationResult] = useState<number | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [teacherMessage, setTeacherMessage] = useState<string | null>(null);
  const [isAskingTeacher, setIsAskingTeacher] = useState(false);

  const currentTask = INITIAL_TASKS[currentTaskIndex];

  // Initialize tokens for current task
  useEffect(() => {
    // Convert task's complex tokens into simpler pieces
    const tokensWithIds: (Token & { id: string })[] = [];
    
    currentTask.tokens.forEach((t, idx) => {
      if (t.type === 'fraction') {
        if (typeof t.numerator === 'number') {
          tokensWithIds.push({ type: 'number', value: t.numerator, id: `num-${idx}-n` });
        }
        if (typeof t.denominator === 'number') {
          tokensWithIds.push({ type: 'number', value: t.denominator, id: `num-${idx}-d` });
        }
        tokensWithIds.push({ type: 'fraction', numerator: null, denominator: null, id: `frame-${idx}` });
      } else {
        tokensWithIds.push({ ...t, id: `${currentTask.id}-${idx}-${Math.random()}` });
      }
    });

    // Add X and = for complex tasks (reverse percentage / base value)
    if (currentTask.type === 'reverse_percentage' || currentTask.type === 'base_value') {
      tokensWithIds.push({ type: 'variable', value: 'x', id: 'var-x' });
      tokensWithIds.push({ type: 'operator', value: '=', id: 'op-eq' });
    }

    setAvailableTokens(tokensWithIds);
    setWorkspaceTokens([]);
    setFeedback({ status: 'idle', message: '' });
    setShowHint(false);
    setActiveFractionId(null);
    setCalculationResult(null);
    setTeacherMessage(null);
    setIsAskingTeacher(false);
  }, [currentTaskIndex]);

  const handleTokenClick = (token: Token & { id: string }) => {
    setTeacherMessage(null);
    if (activeFractionId && token.type === 'number') {
      const fractionIdx = workspaceTokens.findIndex(t => t.id === activeFractionId);
      if (fractionIdx !== -1) {
        const fraction = workspaceTokens[fractionIdx] as FractionToken & { id: string };
        const updatedFraction = { ...fraction };
        if (fraction.selectedSlot === 'numerator') {
          updatedFraction.numerator = token.value;
        } else if (fraction.selectedSlot === 'denominator') {
          updatedFraction.denominator = token.value;
        }
        updatedFraction.selectedSlot = null;
        
        const newWorkspace = [...workspaceTokens];
        newWorkspace[fractionIdx] = updatedFraction;
        setWorkspaceTokens(newWorkspace);
        setActiveFractionId(null);
        return;
      }
    }

    if (workspaceTokens.find(t => t.id === token.id)) {
      setWorkspaceTokens(workspaceTokens.filter(t => t.id !== token.id));
      setAvailableTokens([...availableTokens, token]);
    } else {
      setWorkspaceTokens([...workspaceTokens, token]);
      setAvailableTokens(availableTokens.filter(t => t.id !== token.id));
    }
    setFeedback({ status: 'idle', message: '' });
  };

  const handleFractionSlotClick = (tokenId: string, slot: 'numerator' | 'denominator') => {
    const updatedWorkspace = workspaceTokens.map(t => {
      if (t.id === tokenId && t.type === 'fraction') {
        const isAlreadySelected = t.selectedSlot === slot;
        return { ...t, selectedSlot: isAlreadySelected ? null : slot };
      }
      if (t.type === 'fraction') return { ...t, selectedSlot: null };
      return t;
    });
    
    setWorkspaceTokens(updatedWorkspace);
    
    const target = updatedWorkspace.find(t => t.id === tokenId && t.type === 'fraction') as FractionToken;
    if (target?.selectedSlot) {
      setActiveFractionId(tokenId);
    } else {
      setActiveFractionId(null);
    }
  };

  const clearWorkspace = () => {
    const resetWorkspace = workspaceTokens.map(t => {
      if (t.type === 'fraction') return { ...t, numerator: null, denominator: null, selectedSlot: null };
      return t;
    });
    setAvailableTokens([...availableTokens, ...resetWorkspace]);
    setWorkspaceTokens([]);
    setFeedback({ status: 'idle', message: '' });
    setActiveFractionId(null);
  };

  const checkSolution = () => {
    if (workspaceTokens.length === 0) return;

    // eslint-disable-next-line no-eval
    const targetValue = eval(currentTask.solution);
    const userEval = evaluateExpression(workspaceTokens, targetValue);

    let isCorrect = false;
    let currentVal: number | null = null;

    if (typeof userEval === 'number') {
      currentVal = userEval;
      isCorrect = Math.abs(userEval - targetValue) < 0.0001;
    } else if (userEval && 'left' in userEval) {
      // Equation mode
      currentVal = userEval.left; // Show the value of the built side
      isCorrect = Math.abs(userEval.left - userEval.right) < 0.0001;
    }

    setCalculationResult(currentVal);

    if (isCorrect) {
      setFeedback({ 
        status: 'correct', 
        message: 'Mahtavaa! Rakenne on täsmälleen oikein.' 
      });
    } else {
      setFeedback({ 
        status: 'wrong', 
        message: 'Kokeile vielä uudestaan. Prosentti tarkoittaa osaa sadasta.' 
      });
    }
  };

  const nextTask = () => {
    if (currentTaskIndex < INITIAL_TASKS.length - 1) {
      setCurrentTaskIndex(prev => prev + 1);
    } else {
      setFeedback({ status: 'idle', message: 'COMPLETE' });
    }
  };

  const askTeacher = async () => {
    setIsAskingTeacher(true);
    setTeacherMessage(null);
    const hint = await getTeacherHint(currentTask, workspaceTokens);
    setTeacherMessage(hint);
    setIsAskingTeacher(false);
  };

  const isFinished = feedback.message === 'COMPLETE';

  if (isFinished) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-8 text-center">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white p-12 rounded-[3rem] shadow-xl border border-slate-200 max-w-lg w-full"
        >
          <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8">
            <Trophy size={48} />
          </div>
          <h1 className="text-4xl font-black text-slate-800 mb-4 tracking-tight">Onnittelut!</h1>
          <p className="text-lg text-slate-600 mb-8 leading-relaxed">
            Olet suorittanut kaikki harjoitukset ja hallitset prosenttilaskun rakenteet.
          </p>
          <button 
            onClick={() => {
              setCurrentTaskIndex(0);
              setFeedback({ status: 'idle', message: '' });
            }}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg"
          >
            ALOITA ALUSTA
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 font-sans p-3 md:p-8 flex flex-col items-center">
      {/* Header - Compact */}
      <header className="w-full max-w-4xl flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
            <Trophy size={18} />
          </div>
          <h1 className="text-lg font-black tracking-tight">Prosenttimestari</h1>
        </div>
        <div className="bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">{currentTaskIndex + 1}/{INITIAL_TASKS.length}</span>
          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-500 transition-all duration-500" 
              style={{ width: `${((currentTaskIndex + 1) / INITIAL_TASKS.length) * 100}%` }}
            />
          </div>
        </div>
      </header>

      <main className="w-full max-w-4xl flex flex-col gap-4">
        
        {/* Task Text - Compact */}
        <motion.div 
          key={currentTask.id + 'text'}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200"
        >
          <p className="text-lg md:text-xl font-medium leading-tight text-slate-800">
            {currentTask.text}
          </p>
        </motion.div>

        {/* Workspace - Visual target */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lauseke</h2>
            <button onClick={clearWorkspace} className="text-[10px] font-bold text-rose-500 flex items-center gap-1">
              <RotateCcw size={12} /> TYHJENNÄ
            </button>
          </div>
          <div className="bg-white min-h-[100px] p-4 rounded-2xl shadow-inner border-2 border-slate-200 border-dashed flex flex-wrap items-center justify-center gap-2 overflow-hidden">
            <AnimatePresence mode="popLayout">
              {workspaceTokens.length === 0 && (
                <motion.span 
                  key="empty-message"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-slate-300 italic text-xs"
                >
                  Rakenna lasku tästä...
                </motion.span>
              )}
              {workspaceTokens.map((token) => (
                <TokenItem 
                  key={token.id} 
                  token={token} 
                  onClick={() => handleTokenClick(token)}
                  onSlotClick={(slot) => handleFractionSlotClick(token.id, slot)}
                />
              ))}
              {calculationResult !== null && (workspaceTokens.length > 0) && (feedback.status !== 'idle') && (
                <motion.div 
                  key="calc-result"
                  initial={{ opacity: 0, scale: 0.8 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  className="flex items-center gap-2"
                >
                  <span className={`text-xl font-bold font-mono ${feedback.status === 'wrong' ? 'text-rose-400' : 'text-slate-800'}`}>
                    {feedback.status === 'wrong' ? '≠' : '=' }
                  </span>
                  <span className={`text-2xl font-black font-mono ${feedback.status === 'wrong' ? 'text-rose-500' : 'text-indigo-600'}`}>
                    {workspaceTokens.some(t => t.type === 'variable') ? (
                      <span className="italic mr-2 opacity-50">x ≈ </span>
                    ) : null}
                    {Number.isInteger(calculationResult) ? calculationResult : calculationResult.toFixed(2).replace('.', ',')}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Toolbox */}
        <div className="flex flex-col gap-2">
          <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Työkalut</h2>
          <div className="flex flex-wrap gap-2 p-3 bg-slate-200/50 rounded-2xl min-h-[60px]">
            <AnimatePresence mode="popLayout">
              {availableTokens.map((token) => (
                <TokenItem 
                  key={token.id} 
                  token={token} 
                  onClick={() => handleTokenClick(token)}
                  onSlotClick={(slot) => handleFractionSlotClick(token.id, slot)}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Actions & Feedback - Compact */}
        <div className="mt-2 space-y-3">
        {/* Feedback area with Teacher */}
        <div className="flex flex-col gap-3 min-h-[80px]">
          <AnimatePresence mode="wait">
            {feedback.status !== 'idle' && !teacherMessage && (
              <motion.div 
                key="feedback-alert"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className={`p-3 rounded-xl border flex items-center gap-3 ${
                  feedback.status === 'correct' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {feedback.status === 'correct' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                <p className="text-xs font-bold">{feedback.message}</p>
              </motion.div>
            )}

            {teacherMessage && (
              <motion.div 
                key="teacher-hint"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex gap-3 shadow-sm"
              >
                <div className="bg-white p-2 rounded-xl shadow-sm h-fit">
                  <GraduationCap className="text-indigo-600" size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Professori Prosentti</p>
                  <p className="text-sm font-medium leading-relaxed text-indigo-900">{teacherMessage}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex gap-2">
          {feedback.status !== 'correct' ? (
            <>
              <button
                onClick={checkSolution}
                disabled={workspaceTokens.length === 0}
                className={`flex-[2] py-4 rounded-xl font-black text-sm transition-all shadow-sm ${
                  workspaceTokens.length === 0 ? 'bg-slate-200 text-slate-400' : 'bg-slate-800 text-white active:scale-95'
                }`}
              >
                TARKISTA
              </button>
              <button
                onClick={askTeacher}
                disabled={isAskingTeacher}
                className="flex-1 py-4 bg-indigo-600 text-white rounded-xl font-black text-sm active:scale-95 shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isAskingTeacher ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                    <RotateCcw size={18} />
                  </motion.div>
                ) : (
                  <><GraduationCap size={18} /> APUA</>
                )}
              </button>
            </>
          ) : (
            <button
              onClick={nextTask}
              className="w-full py-4 bg-emerald-600 text-white rounded-xl font-black text-sm active:scale-95 shadow-md flex items-center justify-center gap-2"
            >
              {currentTaskIndex === INITIAL_TASKS.length - 1 ? 'PAALUPAIKALLE!' : 'SEURAAVA'} <ChevronRight size={16} />
            </button>
          )}
        </div>
        </div>
      </main>

      {/* Persistent Help at Bottom */}
      <div className="mt-auto pt-6 w-full max-w-4xl flex flex-col items-center">
        <button 
          onClick={() => setShowInfo(!showInfo)}
          className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-500 transition-colors"
        >
          <Info size={14} /> {showInfo ? 'Sulje ohje' : 'Miten tämä toimii?'}
        </button>
        
        <AnimatePresence>
          {showInfo && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mt-3"
            >
              <div className="bg-white p-4 rounded-xl border border-slate-200 text-[11px] text-slate-600 leading-relaxed shadow-sm">
                <p className="mb-2 font-bold text-indigo-600">Pikaohje:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Klikkaa lukuja tai merkkejä lisätäksesi ne laskuun.</li>
                  <li>Jos käytät murtolukua (fraction), klikkaa ensin murtoluvun ylä- tai alaosaa ja sitten numeroa täyttääksesi sen.</li>
                  <li>Tavoitteena on rakentaa lauseke, joka laskee kysytyn asian.</li>
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        .font-mono { font-family: 'JetBrains Mono', 'Roboto Mono', monospace; }
        body { overflow-x: hidden; }
      `}</style>
    </div>
  );
}

