import React, { useState } from 'react';
import { Card, Button } from './CommonUI';

export const TasbeehView: React.FC = () => {
  const [phrases] = useState([
    { text: 'سبحان الله وبحمده، سبحان الله العظيم', target: 33 },
    { text: 'الحمد لله رب العالمين', target: 33 },
    { text: 'لا إله إلا الله وحده لا شريك له', target: 33 },
    { text: 'الله أكبر كبيراً والحمد لله كثيراً', target: 33 },
    { text: 'أستغفر الله العظيم وأتوب إليه', target: 100 },
    { text: 'اللهم صلِّ وسلم على نبينا محمد', target: 100 },
    { text: 'لا حول ولا قوة إلا بالله العلي العظيم', target: 33 },
    { text: 'حسبي الله ونعم الوكيل', target: 33 },
  ]);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [count, setCount] = useState(0);
  const [cycles, setCycles] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const currentPhrase = phrases[selectedIdx];

  // Play gentle sound using Web Audio API
  const playClickSound = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(580, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(320, audioCtx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.06);
    } catch {
      // AudioContext unavailable or blocked
    }
  };

  const handleIncrement = () => {
    playClickSound();
    const next = count + 1;
    if (next >= currentPhrase.target) {
      setCount(0);
      setCycles((prev) => prev + 1);
    } else {
      setCount(next);
    }
  };

  const handleReset = () => {
    setCount(0);
  };

  const progressPercent = Math.round((count / currentPhrase.target) * 100);

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto pb-12">
      <Card title="مسبحة أصالة والسكينة" icon="fa-solid fa-peace">
        <p className="text-sm text-olive-800 dark:text-beige-300 mb-6 font-serif leading-relaxed text-center">
          «ألا بذكر الله تطمئن القلوب» — مساحة يومية هادئة لترطيب اللسان واستحضار السكينة
        </p>

        {/* Phrases Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-8">
          {phrases.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setSelectedIdx(idx);
                setCount(0);
              }}
              className={`p-3 rounded-2xl border text-right transition-all cursor-pointer text-xs md:text-sm font-medium ${
                selectedIdx === idx
                  ? 'border-olive-600 bg-olive-50 dark:bg-olive-950/40 text-olive-900 dark:text-beige-50 shadow-xs'
                  : 'border-beige-200 dark:border-dark-border hover:bg-beige-50 dark:hover:bg-dark-bg text-beige-800 dark:text-beige-300'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-serif text-sm md:text-base">{p.text}</span>
                <span className="text-[11px] text-beige-500 mr-2 flex-shrink-0">
                  الهدف: {p.target}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Main Counter Bead Display */}
        <div className="flex flex-col items-center justify-center py-6">
          <div
            onClick={handleIncrement}
            className="relative w-64 h-64 rounded-full border-4 border-olive-500/30 flex flex-col items-center justify-center cursor-pointer select-none transition-transform active:scale-95 shadow-elegant dark:shadow-elegant-dark hover:border-olive-600 bg-white dark:bg-dark-surface"
            title="انقر للتسبيح"
          >
            {/* Soft Progress Ring */}
            <svg className="absolute inset-0 w-full h-full transform -rotate-90 pointer-events-none">
              <circle
                cx="50%"
                cy="50%"
                r="46%"
                fill="none"
                stroke="#678242"
                strokeWidth="6"
                strokeDasharray="750"
                strokeDashoffset={750 - (750 * progressPercent) / 100}
                className="transition-all duration-200"
                strokeLinecap="round"
              />
            </svg>

            <span className="text-xs text-beige-500 mb-1">انقر للتسبيح</span>
            <span className="text-6xl font-sans font-bold text-olive-900 dark:text-beige-50 tabular-nums">
              {count}
            </span>
            <span className="text-xs text-olive-600 dark:text-olive-400 mt-2 font-medium">
              من {currentPhrase.target}
            </span>
          </div>

          <div className="flex items-center gap-4 mt-8">
            <Button
              onClick={handleReset}
              variant="secondary"
              size="sm"
              icon="fa-solid fa-rotate-left"
            >
              تصفير العداد
            </Button>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2.5 rounded-xl border transition-colors cursor-pointer text-sm ${
                soundEnabled
                  ? 'border-olive-400 bg-olive-50 dark:bg-olive-900/30 text-olive-700'
                  : 'border-beige-200 text-beige-400'
              }`}
              title={soundEnabled ? 'كتم الصوت' : 'تشغيل صوت النقر'}
            >
              <i className={`fa-solid ${soundEnabled ? 'fa-volume-high' : 'fa-volume-xmark'}`}></i>
            </button>
          </div>

          <p className="text-xs text-beige-500 mt-4">
            أكملت {cycles} دورات اليوم ({cycles * currentPhrase.target + count} تسبيحة إجمالاً)
          </p>
        </div>
      </Card>
    </div>
  );
};
