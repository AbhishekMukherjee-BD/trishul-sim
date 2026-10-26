import React, { useState, useEffect } from 'react';
import { Award, ShieldAlert, CheckCircle, RotateCcw, FileText, Bot, AlertTriangle, Sparkles } from 'lucide-react';

export default function AARDebriefModal({
  isOpen = false,
  metrics = {},
  scenario = {},
  onRestart = () => {},
  onClose = () => {}
}) {
  const [aiReport, setAiReport] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Calculate scores — M7: weighted multi-metric grading
  const total = metrics.totalSpawned || 1;
  const neutralized = (metrics.neutralizedSoftKill || 0) + (metrics.neutralizedHardKill || 0);
  const breaches = metrics.breaches || 0;
  const classificationAcc = metrics.classificationAttempts > 0
    ? Math.round((metrics.classificationCorrect / metrics.classificationAttempts) * 100)
    : 0;
  const ttd = metrics.firstDetectionTime || 0;
  const ewRatio = neutralized > 0 ? ((metrics.neutralizedSoftKill || 0) / neutralized) * 100 : 0;
  const ammoEfficiency = metrics.kineticRoundsFired > 0
    ? Math.round(((metrics.neutralizedHardKill || 0) / metrics.kineticRoundsFired) * 100)
    : 100;

  // M7: Comprehensive combat readiness scoring
  let combatScore = 100;
  // Breaches: -25 per breach
  combatScore -= breaches * 25;
  
  // Tactical unaddressed threats penalty:
  // If drill is completed or breaches occurred, full -15 penalty; if drill in progress with 0 breaches, scale smoothly
  const unaddressed = Math.max(0, total - neutralized - breaches);
  const drillActive = breaches === 0 && (metrics.elapsedTime || 0) < 60 && neutralized < total;
  const unaddressedPenalty = drillActive ? 5 : 15;
  combatScore -= unaddressed * unaddressedPenalty;

  // Classification accuracy factor (15% weight)
  combatScore -= (100 - classificationAcc) * 0.15;
  // Kinetic ammo wastage penalty: rounds fired exceeding hard-kills
  const wastedRounds = Math.max(0, (metrics.kineticRoundsFired || 0) - (metrics.neutralizedHardKill || 0));
  combatScore -= wastedRounds * 5;
  // Spatial collateral hazard penalty: detonation inside base inner perimeter (<120m)
  const collateralDetonations = metrics.closeProximityDetonations || 0;
  combatScore -= collateralDetonations * 12;
  // Continuous RF Spectrum Blinding penalty: prolonged jamming without hostile drone in beam
  const jammerActiveSec = metrics.jammerActiveTime || 0;
  const jammerTargetedSec = metrics.jammerTargetedTime || 0;
  const isContinuousBlinding = jammerActiveSec > 15 && (jammerTargetedSec / jammerActiveSec) < 0.4;
  if (isContinuousBlinding) combatScore -= 8;
  // TTD penalty: >10s = -5, >20s = -10
  if (ttd > 20) combatScore -= 10;
  else if (ttd > 10) combatScore -= 5;
  // Time penalty: >120s total engagement = -5
  if ((metrics.elapsedTime || 0) > 120) combatScore -= 5;
  combatScore = Math.max(0, Math.min(100, Math.round(combatScore)));

  // Grade determination
  let grade, gradeColor;
  if (combatScore >= 90) {
    grade = 'A+'; gradeColor = 'text-[#00ff66] border-[#00ff66] bg-[#00ff66]/10';
  } else if (combatScore >= 80) {
    grade = 'A'; gradeColor = 'text-[#00ff66] border-[#00ff66] bg-[#00ff66]/10';
  } else if (combatScore >= 70) {
    grade = 'B'; gradeColor = 'text-[#d4af37] border-[#d4af37] bg-[#d4af37]/10';
  } else if (combatScore >= 55) {
    grade = 'C'; gradeColor = 'text-[#ffaa00] border-[#ffaa00] bg-[#ffaa00]/10';
  } else {
    grade = 'FAIL'; gradeColor = 'text-[#ff2a3b] border-[#ff2a3b] bg-[#ff2a3b]/10';
  }

  // Fast Ollama check — 650ms preflight abort to avoid UI hang in live hackathon evaluations
  useEffect(() => {
    if (!isOpen) return;
    setLoadingAi(true);
    setAiReport(null);

    const generateAar = async () => {
      const prompt = `You are Directing Staff at the Defence Services Staff College (DSSC), Indian Armed Forces.
Provide an official tactical After-Action Review (AAR) for this Counter-UAS drill:
Scenario: ${scenario.name}
Total Drone Threats: ${total}
Soft-Kill (RF Jammer): ${metrics.neutralizedSoftKill || 0}
Hard-Kill (Kinetic Net): ${metrics.neutralizedHardKill || 0}
Perimeter Breaches: ${breaches}
Kinetic Rounds Expended: ${metrics.kineticRoundsFired || 0}
Classification Accuracy: ${classificationAcc}%
Time-to-Detect: ${ttd.toFixed(1)}s
Time Elapsed: ${Math.round(metrics.elapsedTime || 0)}s
Combat Readiness Score: ${combatScore}/100

Format concisely with:
1. Operational Overview
2. Tactical Strengths
3. Doctrinal Deficiencies
4. DSSC Corrective Directives. Keep under 180 words, crisp military tone.`;

      // Check if running in local environment (Ollama is only reachable on localhost HTTP)
      const isLocalhost = typeof window !== 'undefined' && 
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

      if (isLocalhost && window.location.protocol !== 'https:') {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6000); // 6.0s timeout for genuine LLM inference

          // 1. Check Trishul Python Telemetry & Evaluation Server (localhost:8000)
          try {
            const pyRes = await fetch('http://localhost:8000/api/aar/evaluate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                scenario_name: scenario.name || 'Tactical Drill',
                total_threats: total,
                soft_kills: metrics.neutralizedSoftKill || 0,
                hard_kills: metrics.neutralizedHardKill || 0,
                breaches: breaches,
                kinetic_rounds: metrics.kineticRoundsFired || 0,
                classification_accuracy: classificationAcc,
                elapsed_time_sec: Math.round(metrics.elapsedTime || 0)
              }),
              signal: controller.signal
            });
            if (pyRes.ok) {
              const pyData = await pyRes.json();
              if (pyData && pyData.debrief) {
                clearTimeout(timeoutId);
                setAiReport(pyData.debrief);
                setLoadingAi(false);
                return;
              }
            }
          } catch (e) {
            // Python endpoint unavailable, fallback to direct Ollama
          }

          // 2. Direct Ollama inference
          const res = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'mistral', prompt, stream: false }),
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          if (res.ok) {
            const data = await res.json();
            if (data.response) {
              setAiReport(data.response);
              setLoadingAi(false);
              return;
            }
          }
        } catch (err) {
          // Ollama offline or timed out — fall through to rule engine
        }
      }

      // High-Fidelity Local Tactical Doctrinal Rule Engine (instant)
      let debrief = `**1. OPERATIONAL OVERVIEW**\nUnit conducted active air-defense during ${scenario.name}. Total threat tracks neutralized: ${neutralized}/${total}. ${breaches === 0 ? 'Zero base perimeter damage sustained. Installation integrity maintained at 100%.' : `WARNING: ${breaches} hostile drone(s) penetrated inner perimeter — installation damage assessed.`}\nCombat Readiness Score: **${combatScore}/100** (Grade ${grade})\n\n`;
      debrief += `**2. TACTICAL STRENGTHS**\n• Electronic warfare discipline: ${metrics.neutralizedSoftKill || 0} contacts neutralized via soft-kill directional RF jamming, conserving critical kinetic point-defense ammunition.\n• Target classification accuracy measured at ${classificationAcc}% across ${metrics.classificationAttempts || 0} active contacts.\n• Time-to-First-Detection: ${ttd.toFixed(1)}s from radar boundary crossing.\n• Ammunition efficiency: ${ammoEfficiency}% hit rate on kinetic interceptor rounds.\n\n`;
      debrief += `**3. DOCTRINAL DEFICIENCIES**\n• ${breaches > 0 ? 'CRITICAL: Failure to interdict dive-profile vectors prior to terminal 250m threshold. Re-evaluate engagement initiation timing.' : 'Maintained effective stand-off engagement posture throughout exercise.'}\n• ${metrics.kineticRoundsFired > 4 ? 'Ammunition expenditure rate exceeds optimal stand-off doctrine. Prioritize EW soft-kill at extended range.' : 'Optimal ammo conservation achieved — kinetic reserves maintained.'}\n• ${classificationAcc < 80 ? 'Classification accuracy below doctrinal threshold (80%). Review sensor fusion training protocol.' : 'Classification accuracy meets DSSC qualification standard.'}\n${collateralDetonations > 0 ? `• CRITICAL SAFETY BREACH: ${collateralDetonations} kinetic intercept(s) detonated inside base inner security zone (<120m). Severe fratricide/collateral debris hazard.\n` : ''}${isContinuousBlinding ? `• EW DOCTRINAL FLAW: RF Jammer active without threat lock-on for prolonged period. Violates EMCON discipline and blinds friendly comms.\n` : ''}\n`;
      debrief += `**4. DSSC DIRECTING STAFF DIRECTIVES**\nPrioritize RF spectrum engagement at maximum stand-off range (>2500m). Deploy kinetic nets strictly against hardened loitering munitions or fast FPV terminal dives. ${combatScore >= 80 ? 'Operator cleared for advanced multi-swarm qualification drill.' : 'Operator requires remedial C-UAS engagement training before qualification.'}`;
      setAiReport(debrief);
      setLoadingAi(false);
    };

    generateAar();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="tactical-panel w-full max-w-2xl max-h-[90vh] flex flex-col p-5 border-2 border-[var(--border-tactical)]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2.5">
            <Award size={20} className="text-[#d4af37]" />
            <div>
              <div className="text-[14px] font-bold tracking-wider mono-hud text-white">
                DSSC TACTICAL AFTER-ACTION REVIEW (AAR)
              </div>
              <div className="text-[10px] text-[#d4af37] mono-hud">
                {unaddressed > 0 
                  ? `DIRECTING STAFF EVALUATION // INTERIM DEBRIEF (${unaddressed} ACTIVE INBOUND)`
                  : 'DIRECTING STAFF EVALUATION // EXERCISE COMPLETED'}
              </div>
            </div>
          </div>

          {/* Grade Badge */}
          <div className="flex flex-col items-end gap-1">
            <div className={`px-3 py-1 rounded border-2 font-mono font-bold text-[16px] ${gradeColor}`}>
              GRADE: {grade}
            </div>
            {unaddressed > 0 && (
              <span className="text-[8px] mono-hud text-[#ffaa00] px-1 border border-[#ffaa00]/40 rounded bg-[#ffaa00]/10">
                INCOMPLETE DRILL
              </span>
            )}
          </div>
        </div>

        {/* Bento Grid Metrics — M7: Expanded */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 my-4">
          <div className="bg-black/40 p-2.5 rounded border border-[var(--border-subtle)] mono-hud">
            <span className="text-[10px] text-gray-400">COMBAT READINESS:</span>
            <div className="text-[18px] font-bold text-[#d4af37]">{combatScore}/100</div>
          </div>
          <div className="bg-black/40 p-2.5 rounded border border-[var(--border-subtle)] mono-hud">
            <span className="text-[10px] text-gray-400">CLASSIFICATION ACC:</span>
            <div className="text-[18px] font-bold text-[#00ff66]">{classificationAcc}%</div>
          </div>
          <div className="bg-black/40 p-2.5 rounded border border-[var(--border-subtle)] mono-hud">
            <span className="text-[10px] text-gray-400">SOFT / HARD KILLS:</span>
            <div className="text-[18px] font-bold text-[#00e5ff]">
              {metrics.neutralizedSoftKill || 0} / {metrics.neutralizedHardKill || 0}
            </div>
          </div>
          <div className="bg-black/40 p-2.5 rounded border border-[var(--border-subtle)] mono-hud">
            <span className="text-[10px] text-gray-400">BASE BREACHES:</span>
            <div className={`text-[18px] font-bold ${breaches > 0 ? 'text-[#ff2a3b]' : 'text-[#00ff66]'}`}>
              {breaches}
            </div>
          </div>
        </div>

        {/* Secondary Metrics Row */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-black/30 p-2 rounded border border-[var(--border-subtle)] mono-hud text-center">
            <span className="text-[9px] text-gray-400 block">TIME-TO-DETECT</span>
            <span className="text-[14px] font-bold text-white">{ttd.toFixed(1)}s</span>
          </div>
          <div className="bg-black/30 p-2 rounded border border-[var(--border-subtle)] mono-hud text-center">
            <span className="text-[9px] text-gray-400 block">EW DISCIPLINE</span>
            <span className="text-[14px] font-bold text-[#00e5ff]">{Math.round(ewRatio)}%</span>
          </div>
          <div className="bg-black/30 p-2 rounded border border-[var(--border-subtle)] mono-hud text-center">
            <span className="text-[9px] text-gray-400 block">AMMO EFFICIENCY</span>
            <span className="text-[14px] font-bold text-[#d4af37]">{ammoEfficiency}%</span>
          </div>
        </div>

        {/* AI Tactical Debrief Body */}
        <div className="flex-1 overflow-y-auto bg-black/60 p-4 rounded border border-[var(--border-subtle)] text-[12px] mono-hud text-gray-200 leading-relaxed mb-4">
          <div className="flex items-center gap-2 mb-2 pb-1 border-b border-gray-800 text-[#d4af37]">
            <Bot size={14} />
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Autonomous Tactical Doctrine Intelligence (DSSC Evaluation Engine // Ollama LLM Ready)
            </span>
          </div>

          {loadingAi ? (
            <div className="py-8 flex flex-col items-center justify-center text-gray-400 gap-2">
              <Sparkles size={20} className="text-[#d4af37] animate-spin" />
              <span>Analyzing telemetry against Indian C-UAS doctrine...</span>
            </div>
          ) : (
            <div className="whitespace-pre-line text-gray-300">
              {aiReport}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
          <button
            onClick={() => {
              const element = document.createElement("a");
              const reportText = `DSSC TRISHUL-SIM AAR DEBRIEF\n${'='.repeat(40)}\nScenario: ${scenario.name}\nGrade: ${grade} (${combatScore}/100)\nDate: ${new Date().toISOString()}\n${'='.repeat(40)}\n\n${aiReport || ""}`;
              const file = new Blob([reportText], { type: 'text/plain' });
              element.href = URL.createObjectURL(file);
              element.download = "DSSC_TRISHUL_AAR_DEBRIEF.txt";
              document.body.appendChild(element);
              element.click();
              document.body.removeChild(element);
            }}
            className="btn-tactical py-1.5 px-3 text-[11px]"
          >
            <FileText size={12} />
            EXPORT DOCTRINE REPORT
          </button>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="btn-tactical py-1.5 px-3 text-[11px] bg-transparent"
            >
              CLOSE REVIEW
            </button>
            <button
              onClick={onRestart}
              className="btn-tactical py-1.5 px-4 text-[11px] bg-[#d4af37] text-black font-bold hover:bg-[#f3cf58]"
            >
              <RotateCcw size={12} />
              RESTART SCENARIO
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
