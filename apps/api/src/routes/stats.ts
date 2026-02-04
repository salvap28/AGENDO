import { Router } from 'express';
import { prisma } from '../index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

function toMin(hhmm: string) { const [h,m] = hhmm.split(':').map(Number); return h*60+m; }
function durMin(s: string, e: string) { return Math.max(0, toMin(e)-toMin(s)); }
function pearson(x: number[], y: number[]) {
  if (x.length !== y.length || x.length < 2) return null;
  const n=x.length;
  const sx=x.reduce((a,b)=>a+b,0), sy=y.reduce((a,b)=>a+b,0);
  const sxx=x.reduce((a,b)=>a+b*b,0), syy=y.reduce((a,b)=>a+b*b,0);
  const sxy=x.reduce((a,_,i)=>a+x[i]*y[i],0);
  const num = n*sxy - sx*sy;
  const den = Math.sqrt((n*sxx - sx*sx)*(n*syy - sy*sy));
  if (!den) return null;
  return +(num/den).toFixed(3);
}

router.get('/full', requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const from = String(req.query.from ?? '');
  const to = String(req.query.to ?? '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return res.status(400).json({ error: "Parámetros 'from' y 'to' requeridos (YYYY-MM-DD)" });
  }

  const [blocks, checkIns, completions] = await Promise.all([
    prisma.block.findMany({ where: { userId, date: { gte: from, lte: to } } }),
    prisma.dailyMetric.findMany({ where: { userId, date: { gte: from, lte: to } } }),
    prisma.completionFeedback.findMany({ where: { userId, instanceDate: { gte: from, lte: to } } })
  ]);

  const byDay: Record<string, { planned: number; completed: number; minutes: number; byHour: Record<number, number> }> = {};
  for (const b of blocks) {
    const d = byDay[b.date] ||= { planned: 0, completed: 0, minutes: 0, byHour: {} };
    d.planned += 1;
    if (b.completed) d.completed += 1;
    d.minutes += durMin(b.start, b.end);
    const startH = Math.floor(toMin(b.start)/60);
    d.byHour[startH] = (d.byHour[startH]||0) + 1;
  }
  const totalPlanned = Object.values(byDay).reduce((a,b)=>a+b.planned,0);
  const totalCompleted = Object.values(byDay).reduce((a,b)=>a+b.completed,0);
  const completionRate = totalPlanned ? +(100*totalCompleted/totalPlanned).toFixed(1) : 0;
  const avgCompletedPerDay = Object.keys(byDay).length ? +( (Object.values(byDay).reduce((a,b)=>a+b.completed,0) / Object.keys(byDay).length).toFixed(2) ) : 0;

  const hourAgg: Record<number, number> = {};
  Object.values(byDay).forEach(d => { for (const h in d.byHour) hourAgg[+h]=(hourAgg[+h]||0)+d.byHour[+h]; });
  const productiveHour = Object.entries(hourAgg).sort((a,b)=>b[1]-a[1])[0]?.[0] ?? null;

  function isWeekend(dateStr: string) { const dt = new Date(dateStr+'T00:00:00'); const day = dt.getDay(); return day===0||day===6; }
  const work = { planned:0, completed:0 }, weekend = { planned:0, completed:0 };
  for (const d of Object.keys(byDay)) {
    if (isWeekend(d)) { weekend.planned+=byDay[d].planned; weekend.completed+=byDay[d].completed; }
    else { work.planned+=byDay[d].planned; work.completed+=byDay[d].completed; }
  }

  // Calcular racha de bloques completados (para productividad)
  const sortedDays = Object.keys(byDay).sort();
  let streak = 0, bestStreak = 0;
  for (const d of sortedDays) {
    if (byDay[d].planned>0 && byDay[d].planned===byDay[d].completed) { streak++; bestStreak=Math.max(bestStreak,streak); }
    else streak=0;
  }

  // Calcular racha de check-ins diarios consecutivos
  // Crear un Set con las fechas que tienen check-in
  const checkInDates = new Set(checkIns.map(ci => ci.date));
  
  // Calcular racha actual: empezar desde hoy y retroceder día por día
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let currentStreak = 0;
  let checkDate = new Date(today);
  
  // Verificar si hoy tiene check-in
  const todayStr = today.toISOString().slice(0, 10);
  if (checkInDates.has(todayStr)) {
    currentStreak = 1;
    checkDate.setDate(checkDate.getDate() - 1);
    
    // Continuar retrocediendo mientras haya check-ins consecutivos
    while (checkDate >= new Date(from + 'T00:00:00')) {
      const dateStr = checkDate.toISOString().slice(0, 10);
      if (checkInDates.has(dateStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break; // Se rompió la racha
      }
    }
  }
  
  // Calcular mejor racha de check-ins en el rango
  const sortedCheckInDates = Array.from(checkInDates).filter(d => d >= from && d <= to).sort();
  let checkInStreak = 0, bestCheckInStreak = 0;
  let prevDate: string | null = null;
  
  for (const dateStr of sortedCheckInDates) {
    if (prevDate) {
      const prev = new Date(prevDate + 'T00:00:00');
      const curr = new Date(dateStr + 'T00:00:00');
      const daysDiff = Math.floor((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === 1) {
        // Día consecutivo - incrementar la racha
        checkInStreak++;
      } else {
        // Se rompió la racha - reiniciar desde 1
        checkInStreak = 1;
      }
      bestCheckInStreak = Math.max(bestCheckInStreak, checkInStreak);
    } else {
      // Primer día - empezar la racha en 1
      checkInStreak = 1;
      bestCheckInStreak = 1;
    }
    prevDate = dateStr;
  }
  
  // Si no hay check-ins, la racha es 0
  if (sortedCheckInDates.length === 0) {
    bestCheckInStreak = 0;
  }

  const avg = (arr: (number|null|undefined)[]) => {
    const vals = arr.filter((v): v is number => typeof v === 'number');
    if (!vals.length) return null;
    return +(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2);
  };
  const moodValue = (m?: string | null) => {
    if (!m) return null;
    const rank: Record<string, number> = { LOW: 1, NEUTRAL: 2, GOOD: 3, EXCELLENT: 4 };
    return rank[m] ?? null;
  };
  const moodAvg = avg(checkIns.map(m=>moodValue(m.mood)));
  const energyAvg = avg(checkIns.map(m=>m.energyLevel ?? null));
  const sleepAvg = avg(checkIns.map(m=>m.sleepDuration ?? null));
  const stressCount = checkIns.reduce((acc, item) => {
    if (item.stress) acc[item.stress] = (acc[item.stress] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const focusCount = checkIns.reduce((acc, item) => {
    if (item.focus) acc[item.focus] = (acc[item.focus] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const focusTop = Object.entries(focusCount).sort((a,b)=>b[1]-a[1])[0]?.[0] ?? null;

  let good=0, bad=0, neutral=0;
  const classify = (m:number|null, e:number|null) => {
    if (m==null || e==null) return 'neutral';
    const s = m+e;
    if (s>=8) return 'good';
    if (s<=4) return 'bad';
    return 'neutral';
  };
  for (const m of checkIns) {
    const c = classify(moodValue(m.mood), m.energyLevel ?? null);
    if (c==='good') good++; else if (c==='bad') bad++; else neutral++;
  }
  const totalDays = good+bad+neutral || 1;
  const pctGood = +(100*good/totalDays).toFixed(1);
  const pctNeutral = +(100*neutral/totalDays).toFixed(1);
  const pctBad = +(100*bad/totalDays).toFixed(1);

  const pairsSleepMood = checkIns
    .filter(m=>m.sleepDuration!=null && m.mood!=null)
    .map(m=>[m.sleepDuration!, moodValue(m.mood)!]);
  const corrSleepMood = pearson(pairsSleepMood.map(p=>p[0]), pairsSleepMood.map(p=>p[1]));

  const pairsSleepEnergy = checkIns
    .filter(m=>m.sleepDuration!=null && m.energyLevel!=null)
    .map(m=>[m.sleepDuration!, m.energyLevel!]);
  const corrSleepEnergy = pearson(pairsSleepEnergy.map(p=>p[0]), pairsSleepEnergy.map(p=>p[1]));

  const pairsQualityEnergy = checkIns
    .filter(m=>m.sleepQuality!=null && m.energyLevel!=null)
    .map(m=>[m.sleepQuality!, m.energyLevel!]);
  const corrQualityEnergy = pearson(pairsQualityEnergy.map(p=>p[0]), pairsQualityEnergy.map(p=>p[1]));

  const feelingCount = completions.reduce((acc, item) => {
    acc[item.feeling] = (acc[item.feeling] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const focusQuality = completions.reduce((acc, item) => {
    acc[item.focus] = (acc[item.focus] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const interruptionReasons = completions.reduce((acc, item) => {
    if (item.interrupted && item.interruptionReason) {
      acc[item.interruptionReason] = (acc[item.interruptionReason] ?? 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  const timeDelta = completions.reduce((acc, item) => {
    acc[item.timeDelta] = (acc[item.timeDelta] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const interruptionRate = completions.length
    ? +(100 * (completions.filter((c) => c.interrupted).length / completions.length)).toFixed(1)
    : 0;

  res.json({
    range: { from, to },
    state: {
      moodAvg, energyAvg, sleepAvg,
      stress: stressCount,
      focusLeader: focusTop,
      dayClassPct: { good: pctGood, neutral: pctNeutral, bad: pctBad }
    },
    productivity: {
      completionRate, avgCompletedPerDay, productiveHour,
      workdays: { planned: work.planned, completed: work.completed },
      weekend: { planned: weekend.planned, completed: weekend.completed },
      bestStreak: bestStreak,
      currentCheckInStreak: currentStreak,
      bestCheckInStreak: bestCheckInStreak
    },
    correlations: {
      sleep_mood: corrSleepMood,
      sleep_energy: corrSleepEnergy,
      quality_energy: corrQualityEnergy
    },
    completionInsights: {
      total: completions.length,
      feelings: feelingCount,
      focus: focusQuality,
      interruptionRate,
      interruptionReasons,
      timeDelta
    }
  });
});

export default router;
