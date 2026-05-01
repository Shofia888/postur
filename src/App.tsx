import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WEEKS, HABITS, RATINGS, RATING_LABELS, WeekData } from './data';
import { Dumbbell, Calendar, BarChart2, Check, RefreshCw, X, Play, RotateCcw } from 'lucide-react';

const STORAGE_KEY = 'posture_v3';

type DayData = { s1: boolean[][]; s2: boolean[][]; habits: boolean[]; rating: number; notes: string };
type AppState = { startDate?: string; [key: string]: any };

const initDay = (w: number): DayData => {
  const d = WEEKS[w];
  return {
    s1: d.section1.map(e => Array(e.sets).fill(false)),
    s2: d.section2.map(e => Array(e.sets).fill(false)),
    habits: Array(HABITS.length).fill(false),
    rating: 0,
    notes: ""
  };
};

export default function App() {
  const [data, setData] = useState<AppState>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
  });
  const [tab, setTab] = useState<'latihan'|'kalender'|'ringkasan'>('latihan');
  const [week, setWeek] = useState(0);
  const [day, setDay] = useState(0);
  const [toast, setToast] = useState<string|null>(null);

  const [timerSeconds, setTimerSeconds] = useState(60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerOpen, setTimerOpen] = useState(false);
  const [preset, setPreset] = useState(60);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }, [data]);

  useEffect(() => {
    if (data.startDate) {
      const diff = Math.floor((new Date().setHours(0,0,0,0) - new Date(data.startDate).getTime()) / 86400000);
      if (diff >= 0 && diff < 56) { setWeek(Math.floor(diff / 7)); setDay(diff % 7); }
    }
  }, [data.startDate]);

  useEffect(() => {
    let interval: any;
    if (timerRunning && timerSeconds > 0) interval = setInterval(() => setTimerSeconds(s => s - 1), 1000);
    else if (timerRunning && timerSeconds === 0) {
      setTimerRunning(false); setTimerSeconds(preset);
      showToast("⏰ Istirahat selesai! Lanjutkan set berikutnya.");
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    }
    return () => clearInterval(interval);
  }, [timerRunning, timerSeconds, preset]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };
  
  const getDayKey = (w: number, d: number) => `w${w}_d${d}`;
  const getDayData = (w: number, d: number): DayData => {
    const dData = data[getDayKey(w, d)];
    const wData = WEEKS[w];
    if (!dData || !dData.s1 || !dData.s2 || !dData.habits || !wData) return initDay(w);
    if (dData.s1.length !== wData.section1.length || dData.s2.length !== wData.section2.length) return initDay(w);
    return dData;
  };
  const setDayData = (w: number, d: number, dData: DayData) => {
    setData(prev => ({ ...prev, [getDayKey(w, d)]: dData }));
  };

  const calcDayProgress = (w: number, d: number) => {
    try {
      const dData = getDayData(w, d);
      const wData = WEEKS[w];
      let total = HABITS.length, done = dData.habits.filter(Boolean).length;
      wData.section1.forEach((e, i) => { total += e.sets; done += (dData.s1[i] || []).filter(Boolean).length; });
      wData.section2.forEach((e, i) => { total += e.sets; done += (dData.s2[i] || []).filter(Boolean).length; });
      return total === 0 ? 0 : Math.round((done / total) * 100);
    } catch {
      return 0;
    }
  };

  const curData = getDayData(week, day);
  const curWeekData = WEEKS[week];
  const dayPct = calcDayProgress(week, day);

  const setStartDate = (e: any) => {
    setData(p => ({ ...p, startDate: e.target.value }));
    showToast('Tanggal mulai disimpan ✓');
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 font-sans pb-24 selection:bg-emerald-100">
      {/* Header */}
      <header className="bg-gradient-to-br from-emerald-700 to-emerald-600 px-5 pt-6 pb-5 text-white shadow-md rounded-b-3xl">
        <div className="flex justify-between items-start max-w-md mx-auto">
          <div>
            <h1 className="font-bold text-xl tracking-tight mb-1">🧘 Posture Correction</h1>
            <p className="text-emerald-100 text-xs font-medium">8 Week Tracker &middot; Konsistensi postur ideal</p>
          </div>
          <div className="bg-white/20 backdrop-blur-md rounded-2xl px-4 py-2 flex flex-col items-center">
            <span className="font-bold text-2xl leading-none">
              {Object.keys(data).filter(k => {
                const match = k.match(/^w(\d+)_d(\d+)$/);
                if (!match) return false;
                const wIdx = parseInt(match[1]);
                const dIdx = parseInt(match[2]);
                if (wIdx < 0 || wIdx >= WEEKS.length) return false;
                return calcDayProgress(wIdx, dIdx) === 100;
              }).length}
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-90 mt-1">Selesai</span>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-5">
        {tab === 'latihan' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {/* Week Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
              {WEEKS.map((w, i) => (
                <button key={i} onClick={() => { setWeek(i); setDay(0); }}
                  className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                    week === i ? 'bg-emerald-600 text-white shadow-md' : 'bg-stone-200/60 text-stone-600 hover:bg-stone-300'
                  }`}>
                  Minggu {w.week}
                </button>
              ))}
            </div>
            {/* Day Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
              {Array.from({ length: 7 }).map((_, i) => {
                const done = calcDayProgress(week, i) === 100;
                return (
                  <button key={i} onClick={() => setDay(i)}
                    className={`shrink-0 min-w-14 px-3 py-2 rounded-xl text-xs font-semibold flex flex-col items-center gap-1 transition-all border ${
                      day === i ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm' : 'border-stone-200 bg-white text-stone-500'
                    }`}>
                    <span>Hari {i + 1}</span>
                    {done && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                  </button>
                );
              })}
            </div>

            <div className="bg-gradient-to-r from-orange-400 to-amber-500 rounded-2xl p-4 text-white shadow-sm mb-5">
              <h2 className="font-bold">{curWeekData.title}</h2>
              <p className="text-sm opacity-90">{curWeekData.focus}</p>
            </div>

            {dayPct === 100 ? (
              <div className="bg-emerald-100 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-sm font-medium mb-5 flex items-center gap-3">
                <span className="text-xl">🎉</span> Latihan hari ini selesai. Konsistensi lebih penting dari kesempurnaan.
              </div>
            ) : null}

            {/* Actions */}
            <div className="flex gap-2 mb-6">
              <button onClick={() => {
                const d = { ...curData, habits: Array(HABITS.length).fill(true) };
                d.s1 = curWeekData.section1.map(e => Array(e.sets).fill(true));
                d.s2 = curWeekData.section2.map(e => Array(e.sets).fill(true));
                setDayData(week, day, d); showToast('Semua selesai hari ini!');
              }} className="flex-1 bg-emerald-600 text-white rounded-xl py-2.5 text-sm font-semibold active:scale-95 transition-transform">
                ✓ Selesaikan
              </button>
              <button onClick={() => {
                if (confirm('Reset hari ini?')) setDayData(week, day, initDay(week));
              }} className="flex-1 bg-white border border-stone-200 text-stone-600 rounded-xl py-2.5 text-sm font-semibold active:scale-95 transition-transform">
                ↺ Reset
              </button>
            </div>

            {/* Sections */}
            {[
              { id: 's1', title: 'Reset Postur Harian', sub: 'Lakukan tiap hari — 5–10 menit', emoji: '🌿', color: 'bg-emerald-100 text-emerald-700', data: curWeekData.section1, state: curData.s1 },
              { id: 's2', title: 'Latihan Utama', sub: '3–4× per minggu — 20–30 menit', emoji: '💪', color: 'bg-blue-100 text-blue-700', data: curWeekData.section2, state: curData.s2 }
            ].map((sec) => (
              <div key={sec.id} className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100 mb-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${sec.color}`}>{sec.emoji}</div>
                  <div>
                    <h3 className="font-bold text-stone-800">{sec.title}</h3>
                    <p className="text-xs text-stone-500">{sec.sub}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {sec.data.map((ex, exIdx) => {
                    const stateArr = sec.state[exIdx] || [];
                    const allDone = stateArr.length > 0 && stateArr.every(Boolean);
                    return (
                      <div key={exIdx} className={`p-3 rounded-xl border transition-colors ${allDone ? 'border-emerald-200 bg-emerald-50/50' : 'border-stone-100'}`}>
                        <div className="font-semibold text-sm text-stone-800">{ex.name}</div>
                        <div className="text-xs text-amber-600 font-medium mb-3 mt-0.5">{ex.sets} set &times; {ex.detail}</div>
                        <div className="flex flex-wrap gap-2">
                          {stateArr.map((isDone, setIdx) => (
                            <button key={setIdx} onClick={() => {
                              const nd = { ...curData };
                              (nd as any)[sec.id][exIdx][setIdx] = !isDone;
                              setDayData(week, day, nd);
                            }}
                              className={`w-9 h-9 rounded-lg text-xs font-bold transition-all active:scale-90 ${
                                isDone ? 'bg-emerald-500 text-white shadow-sm' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                              }`}>
                              S{setIdx + 1}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Habits */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100 mb-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-lg shrink-0">🎯</div>
                <div><h3 className="font-bold text-stone-800">Kebiasaan Postur</h3><p className="text-xs text-stone-500">Centang harian</p></div>
              </div>
              <div className="space-y-1">
                {HABITS.map((h, i) => (
                  <button key={i} onClick={() => {
                    const nd = { ...curData }; nd.habits[i] = !nd.habits[i]; setDayData(week, day, nd);
                  }} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-stone-50 transition-colors text-left">
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors border-2 ${
                      curData.habits[i] ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-stone-300'
                    }`}>
                      {curData.habits[i] && <Check className="w-4 h-4" />}
                    </div>
                    <span className={`text-sm ${curData.habits[i] ? 'text-stone-800' : 'text-stone-600'}`}>{h}</span>
                  </button>
                ))}
              </div>
            </div>

          </motion.div>
        )}

        {tab === 'kalender' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-100">
              <label className="text-sm font-bold text-stone-800 block mb-2">📌 Tanggal mulai program</label>
              <input type="date" value={data.startDate || ''} onChange={setStartDate} 
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm outline-none focus:border-emerald-500" />
            </div>
            
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-100">
              {WEEKS.map((w, wi) => (
                <div key={wi} className="mb-6 last:mb-0">
                  <div className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">{w.title}</div>
                  <div className="grid grid-cols-7 gap-2">
                    {Array.from({ length: 7 }).map((_, di) => {
                      const pct = calcDayProgress(wi, di);
                      return (
                        <button key={di} onClick={() => { setWeek(wi); setDay(di); setTab('latihan'); }}
                          className={`aspect-square rounded-xl flex flex-col items-center justify-center relative transition-transform active:scale-90 border-2 ${
                            wi === week && di === day ? 'border-amber-400 ring-2 ring-amber-100' : 'border-transparent' // current select
                          } ${
                            pct === 100 ? 'bg-emerald-100 text-emerald-800' : pct > 0 ? 'bg-orange-100 text-orange-800' : 'bg-stone-100 text-stone-400'
                          }`}>
                          <span className="font-bold text-sm leading-none">{di + 1}</span>
                          {pct > 0 && pct < 100 && <span className="text-[9px] font-bold mt-0.5">{pct}%</span>}
                          {pct === 100 && <Check className="w-3 h-3 mt-0.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {tab === 'ringkasan' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 p-6 rounded-3xl text-white text-center shadow-md">
              <div className="text-5xl font-bold mb-2">
                {Math.round(Array.from({length:8}).flatMap((_,wi)=>Array.from({length:7}).map((_,di)=>calcDayProgress(wi,di))).reduce((a,b)=>a+b,0)/56)}%
              </div>
              <div className="text-xs font-semibold uppercase tracking-wider opacity-80">Total Progress</div>
            </div>
          </motion.div>
        )}
      </main>

      {/* Timer FAB */}
      <button onClick={() => setTimerOpen(true)}
        className={`fixed bottom-24 right-5 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white transition-colors z-40 ${
          timerRunning ? 'bg-amber-500 animate-pulse' : 'bg-emerald-600'
        }`}>
        <span className="text-2xl">⏱</span>
      </button>

      {/* Timer Overlay */}
      <AnimatePresence>
        {timerOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-5">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl relative">
              <button onClick={() => setTimerOpen(false)} className="absolute top-4 right-4 text-stone-400 hover:text-stone-600">
                <X className="w-6 h-6" />
              </button>
              <h3 className="font-bold text-stone-800 mb-2">Timer Istirahat</h3>
              <div className={`text-6xl font-bold font-mono tracking-tight my-6 ${timerRunning ? 'text-amber-500' : 'text-stone-800'}`}>
                {Math.floor(timerSeconds/60)}:{(timerSeconds%60).toString().padStart(2,'0')}
              </div>
              <div className="flex justify-center gap-2 mb-8">
                {[30, 45, 60, 90].map(p => (
                  <button key={p} onClick={() => { setPreset(p); setTimerSeconds(p); setTimerRunning(false); }}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                      preset === p ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}>{p}s</button>
                ))}
              </div>
              <div className="flex gap-3 justify-center">
                <button onClick={() => {
                  if(!timerRunning && timerSeconds === 0) setTimerSeconds(preset);
                  setTimerRunning(!timerRunning);
                }} className={`px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 text-white ${
                    timerRunning ? 'bg-amber-500' : 'bg-emerald-600'
                  }`}>
                  {timerRunning ? '⏸ Jeda' : '▶ Mulai'}
                </button>
                <button onClick={() => { setTimerRunning(false); setTimerSeconds(preset); }} 
                  className="px-6 py-3 rounded-2xl font-bold text-sm bg-stone-100 text-stone-600 flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" /> Reset
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-stone-900 text-white px-5 py-3 rounded-full text-sm font-medium shadow-xl z-50 whitespace-nowrap">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 w-full bg-white border-t border-stone-200 pb-safe pt-2 px-6 flex justify-around items-center z-40 text-[10px] font-bold uppercase tracking-wider">
        <button onClick={() => setTab('latihan')} className={`flex flex-col items-center gap-1.5 p-2 transition-colors ${tab==='latihan' ? 'text-emerald-600' : 'text-stone-400'}`}>
          <Dumbbell className="w-6 h-6" /> Latihan
        </button>
        <button onClick={() => setTab('kalender')} className={`flex flex-col items-center gap-1.5 p-2 transition-colors ${tab==='kalender' ? 'text-emerald-600' : 'text-stone-400'}`}>
          <Calendar className="w-6 h-6" /> Kalender
        </button>
        <button onClick={() => setTab('ringkasan')} className={`flex flex-col items-center gap-1.5 p-2 transition-colors ${tab==='ringkasan' ? 'text-emerald-600' : 'text-stone-400'}`}>
          <BarChart2 className="w-6 h-6" /> Ringkasan
        </button>
      </nav>
    </div>
  );
}
