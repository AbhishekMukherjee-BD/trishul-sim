import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  Activity,
  Radio,
  Crosshair,
  Volume2,
  VolumeX,
  RotateCcw,
  BookOpen,
  Award,
  AlertTriangle,
  Eye,
  Layers,
  Sparkles
} from 'lucide-react';

import { SwarmEngine, SCENARIO_PRESETS, BASE_ORIGIN } from './simulation/SwarmEngine';
import RadarViewport from './components/RadarViewport';
import FLIRViewport from './components/FLIRViewport';
import SensorSuite from './components/SensorSuite';
import TargetTrackCard from './components/TargetTrackCard';
import WeaponConsole from './components/WeaponConsole';
import AARDebriefModal from './components/AARDebriefModal';
import MissionBriefingModal from './components/MissionBriefingModal';

export default function App() {
  const [engineState, setEngineState] = useState(null);
  const [viewMode, setViewMode] = useState('SPLIT');
  const [briefingOpen, setBriefingOpen] = useState(true); // M1: show briefing on startup
  const [aarOpen, setAarOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [bootDone, setBootDone] = useState(false); // M5: splash screen

  const engineRef = useRef(null);
  const audioCtxRef = useRef(null);

  // Initialize SwarmEngine
  useEffect(() => {
    const engine = new SwarmEngine((state) => {
      setEngineState({ ...state });
    });
    engineRef.current = engine;
    engine.loadScenario('SCENARIO_1'); // M1: Start with beginner scenario

    // 60Hz physics clock loop
    let lastTime = performance.now();
    let animId;

    const loop = (now) => {
      animId = requestAnimationFrame(loop);
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;
      engine.update(dt);
    };
    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, []);

  // M5: Boot sequence splash
  useEffect(() => {
    const timer = setTimeout(() => setBootDone(true), 1800);
    return () => clearTimeout(timer);
  }, []);

  // L2: Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e) => {
      if (!engineRef.current) return;
      const key = e.key.toLowerCase();
      if (key === 'j') handleToggleJammer();
      else if (key === 'k' || key === ' ') {
        e.preventDefault();
        if (engineRef.current.getSelectedDrone()) {
          handleFireKinetic(engineRef.current.getSelectedDrone().id);
        }
      }
      else if (key === 'g') engineRef.current.toggleGnssSpoofer();
      else if (key === '1') { engineRef.current.loadScenario('SCENARIO_1'); setBriefingOpen(false); }
      else if (key === '2') { engineRef.current.loadScenario('SCENARIO_2'); setBriefingOpen(false); }
      else if (key === '3') { engineRef.current.loadScenario('SCENARIO_3'); setBriefingOpen(false); }
      else if (key === 'escape') { setAarOpen(false); setBriefingOpen(false); }
      else if (key === 'tab') {
        e.preventDefault();
        const drones = engineRef.current.drones;
        const currentIdx = drones.findIndex(d => d.id === engineRef.current.selectedDroneId);
        const nextIdx = (currentIdx + 1) % drones.length;
        if (drones[nextIdx]) engineRef.current.selectDrone(drones[nextIdx].id);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [soundEnabled]);

  // Web Audio Synthesizer
  const playTone = (freq, duration, type = 'sine', vol = 0.08) => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Audio autoplay policy
    }
  };

  // Tactical Audio Cues
  const playRadarLock = () => {
    playTone(1100, 0.06, 'sine', 0.09);
    setTimeout(() => playTone(1450, 0.08, 'sine', 0.1), 70);
  };

  const playKillChirp = () => {
    playTone(380, 0.1, 'triangle', 0.12);
    setTimeout(() => playTone(760, 0.22, 'triangle', 0.14), 100);
  };

  const playBreachAlarm = () => {
    playTone(850, 0.2, 'sawtooth', 0.15);
    setTimeout(() => playTone(650, 0.25, 'sawtooth', 0.15), 180);
  };

  // Sound cues on actions
  const handleToggleJammer = () => {
    if (!engineRef.current) return;
    const nextState = !engineRef.current.rfJammerActive;
    engineRef.current.toggleRfJammer(nextState);
    if (nextState) playTone(180, 0.4, 'sawtooth', 0.1);
  };

  const handleFireKinetic = (targetId) => {
    if (!engineRef.current) return;
    if (engineRef.current.fireKineticNet(targetId)) {
      playTone(450, 0.25, 'triangle', 0.12);
    }
  };

  // Monitor kills and breaches to fire audio acknowledgements
  const lastSoftKillsRef = useRef(0);
  const lastHardKillsRef = useRef(0);
  const lastBreachesRef = useRef(0);

  useEffect(() => {
    const m = engineState?.metrics;
    if (!m) return;
    if (m.neutralizedSoftKill > lastSoftKillsRef.current || m.neutralizedHardKill > lastHardKillsRef.current) {
      playKillChirp();
    }
    if (m.breaches > lastBreachesRef.current) {
      playBreachAlarm();
    }
    lastSoftKillsRef.current = m.neutralizedSoftKill || 0;
    lastHardKillsRef.current = m.neutralizedHardKill || 0;
    lastBreachesRef.current = m.breaches || 0;
  }, [engineState?.metrics?.neutralizedSoftKill, engineState?.metrics?.neutralizedHardKill, engineState?.metrics?.breaches]);

  // Check Mission Completion to auto-open AAR
  useEffect(() => {
    if (!engineState || !engineRef.current || !engineRef.current.isRunning) return;
    const { drones, metrics } = engineState;
    if (drones.length > 0) {
      const activeCount = drones.filter(
        d => d.state === 'INGRESS' || d.state === 'EVADING'
      ).length;

      // When all threats are resolved
      if (activeCount === 0 && metrics.elapsedTime > 5 && !aarOpen) {
        setAarOpen(true);
      }
    }
  }, [engineState, aarOpen]);

  if (!engineState || !bootDone) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-[#06080c] text-[#d4af37] mono-hud gap-4">
        <div className="relative">
          <Shield size={48} className="text-[#d4af37] animate-pulse" />
        </div>
        <div className="text-[18px] font-bold tracking-[0.3em] text-white">TRISHUL-SIM</div>
        <div className="text-[11px] tracking-[0.15em] text-[#d4af37]">COUNTER-UAS TACTICAL TRAINER // DSSC</div>
        <div className="flex items-center gap-2 mt-4">
          <div className="w-2 h-2 rounded-full bg-[#00ff66] animate-pulse" />
          <span className="text-[10px] text-gray-400">INITIALIZING TACTICAL CORE SUBSYSTEMS...</span>
        </div>
        <div className="w-48 h-1 bg-gray-800 rounded overflow-hidden mt-2">
          <div className="h-full bg-gradient-to-r from-[#d4af37] to-[#00ff66] animate-pulse" style={{ width: '70%' }} />
        </div>
      </div>
    );
  }

  const {
    drones,
    selectedDrone,
    rfJammerActive,
    rfJammerAzimuth,
    gnssSpooferActive,
    kineticAmmo,
    interceptors,
    environment,
    metrics,
    scenario
  } = engineState;

  const activeCount = drones.filter(
    d => d.state === 'INGRESS' || d.state === 'EVADING'
  ).length;

  return (
    <div className="w-screen h-screen flex flex-col bg-[#06080c] overflow-hidden text-white relative">
      {/* Visual Scanline Filter */}
      <div className="scanlines" />
      <div className="vignette" />

      {/* ════ TOP TACTICAL NAVIGATION BAR ════ */}
      <header className="h-12 w-full bg-[#0a0e16] border-b border-[var(--border-subtle)] px-4 flex items-center justify-between z-20">
        {/* Left: Crest & Title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Shield size={20} className="text-[#d4af37]" />
            <span className="font-bold tracking-wider text-[14px] mono-hud text-white">
              TRISHUL-SIM // C-UAS
            </span>
          </div>
          <span className="text-[10px] text-gray-500 font-mono hidden md:inline">|</span>
          <span className="text-[11px] text-[#d4af37] mono-hud hidden md:inline">
            DSSC OPERATIONAL TRAINER // SIH26247
          </span>
          <span className="badge-hostile text-[9px] ml-2">
            {scenario.threatLevel}
          </span>
        </div>

        {/* Center: Mission Timer + Scenario Badge */}
        <div className="hidden lg:flex items-center gap-3">
          <div className="flex items-center gap-2 bg-black/50 px-3 py-1 rounded border border-[var(--border-subtle)] text-[11px] mono-hud">
            <span className="text-gray-400">OPERATION:</span>
            <span className="text-[#d4af37] font-bold">{scenario.name}</span>
            <span className="text-gray-600">|</span>
            <span className="text-[#00ff66] font-bold">{activeCount} INGRESSING</span>
          </div>
          {/* L1: Mission Timer */}
          <div className="flex items-center gap-1.5 bg-black/50 px-2.5 py-1 rounded border border-[var(--border-subtle)] text-[11px] mono-hud">
            <Activity size={12} className="text-[#d4af37]" />
            <span className="text-white font-bold tabular-nums">
              {String(Math.floor(metrics.elapsedTime / 60)).padStart(2, '0')}:{String(Math.floor(metrics.elapsedTime % 60)).padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* Right: Controls & Actions */}
        <div className="flex items-center gap-2">
          {/* Audio toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 rounded hover:bg-white/5 text-gray-400 hover:text-white"
            title={soundEnabled ? 'Mute Audio' : 'Enable Audio'}
          >
            {soundEnabled ? <Volume2 size={16} className="text-[#00ff66]" /> : <VolumeX size={16} />}
          </button>

          {/* View Toggles */}
          <div className="flex bg-black/60 p-0.5 rounded border border-[var(--border-subtle)]">
            <button
              onClick={() => setViewMode('SPLIT')}
              className={`px-2 py-0.5 text-[10px] font-mono rounded ${
                viewMode === 'SPLIT' ? 'bg-[#d4af37] text-black font-bold' : 'text-gray-400'
              }`}
            >
              SPLIT
            </button>
            <button
              onClick={() => setViewMode('RADAR_FOCUS')}
              className={`px-2 py-0.5 text-[10px] font-mono rounded ${
                viewMode === 'RADAR_FOCUS' ? 'bg-[#d4af37] text-black font-bold' : 'text-gray-400'
              }`}
            >
              RADAR
            </button>
            <button
              onClick={() => setViewMode('FLIR_FOCUS')}
              className={`px-2 py-0.5 text-[10px] font-mono rounded ${
                viewMode === 'FLIR_FOCUS' ? 'bg-[#d4af37] text-black font-bold' : 'text-gray-400'
              }`}
            >
              FLIR
            </button>
          </div>

          {/* Scenario Selector */}
          <button
            onClick={() => setBriefingOpen(true)}
            className="btn-tactical py-1 px-2.5 text-[10px]"
          >
            <BookOpen size={12} />
            SCENARIO
          </button>

          {/* Trigger AAR Modal */}
          <button
            onClick={() => setAarOpen(true)}
            className="btn-tactical py-1 px-2.5 text-[10px] bg-[#d4af37]/20 border-[#d4af37]"
          >
            <Award size={12} />
            DEBRIEF
          </button>

          {/* Video Portal Link */}
          <a
            href="/portal.html"
            className="btn-tactical py-1 px-2.5 text-[10px] text-[#00e5ff] border-[#00e5ff]/40 bg-[#00e5ff]/10 hover:bg-[#00e5ff]/25 hover:border-[#00e5ff]"
            title="Open Tactical Video Briefing Portal"
          >
            <Eye size={12} />
            VIDEO PORTAL
          </a>

          {/* Reset */}
          <button
            onClick={() => engineRef.current?.resetSimulation()}
            className="p-1.5 rounded hover:bg-white/5 text-gray-400 hover:text-white"
            title="Reset Simulation"
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </header>

      {/* ════ MAIN COMBAT INFORMATION CENTER BODY ════ */}
      <main className="flex-1 w-full grid grid-cols-12 gap-2.5 p-2.5 overflow-hidden z-10">
        {/* ── LEFT RAIL: SENSOR SUITE & CONTACT ROSTER (3 COLS) ── */}
        <aside className="col-span-12 lg:col-span-3 flex flex-col gap-2.5 overflow-y-auto">
          <SensorSuite
            drones={drones}
            selectedDrone={selectedDrone}
            environment={environment}
          />

          {/* Active Contacts Roster List */}
          <div className="tactical-panel flex-1 p-3 flex flex-col min-h-[220px]">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)] mb-2">
              <span className="text-[11px] font-bold mono-hud text-white">
                CONTACT ROSTER ({drones.length})
              </span>
              <span className="text-[10px] mono-hud text-[#00ff66]">
                {activeCount} AIRBORNE
              </span>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 pr-1">
              {drones.map(d => {
                const isSelected = selectedDrone && selectedDrone.id === d.id;
                const dist = Math.round(d.position.distanceTo(BASE_ORIGIN));
                return (
                  <div
                    key={d.id}
                    onClick={() => {
                      engineRef.current?.selectDrone(d.id);
                      playRadarLock();
                    }}
                    className={`p-2 rounded border cursor-pointer transition-all mono-hud text-[11px] flex items-center justify-between ${
                      isSelected
                        ? 'bg-[#00ff66]/15 border-[#00ff66] text-white'
                        : 'bg-black/40 border-[var(--border-subtle)] text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <span className={`text-[9px] px-1 rounded ${
                          d.classifiedAs ? 'bg-black/60 text-[#00ff66] font-bold' : 'bg-black/60 text-gray-500'
                        }`}>
                          {d.classifiedAs ? d.type.code : 'UNVERIFIED'}
                        </span>
                        <span>{d.id}</span>
                      </div>
                      <div className="text-[9px] text-gray-400">
                        RNG: {dist}m // ALT: {Math.round(d.altitude)}m
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                          d.state === 'NEUTRALIZED'
                            ? 'bg-gray-800 text-gray-500'
                            : d.state === 'JAMMED_RTH'
                            ? 'bg-[#00e5ff]/20 text-[#00e5ff]'
                            : d.state === 'BREACHED'
                            ? 'bg-red-600 text-white'
                            : 'bg-red-500/20 text-[#ff4455]'
                        }`}
                      >
                        {d.state === 'JAMMED_RTH' ? 'RTH' : d.state}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* ── CENTER / RIGHT VIEWPORTS (9 COLS) ── */}
        <section className="col-span-12 lg:col-span-9 flex flex-col gap-2.5 overflow-hidden">
          {/* Main Visual Display Split */}
          <div className="flex-1 grid grid-cols-12 gap-2.5 overflow-hidden min-h-[380px]">
            {/* Primary 3D Radar Viewport */}
            <div
              className={`tactical-panel overflow-hidden transition-all duration-300 ${
                viewMode === 'RADAR_FOCUS'
                  ? 'col-span-12'
                  : viewMode === 'FLIR_FOCUS'
                  ? 'hidden'
                  : 'col-span-12 xl:col-span-8'
              }`}
            >
              <RadarViewport
                drones={drones}
                selectedDrone={selectedDrone}
                rfJammerActive={rfJammerActive}
                rfJammerAzimuth={rfJammerAzimuth}
                rfJammerElevation={engineState.rfJammerElevation ?? 15}
                interceptors={interceptors}
                onSelectDrone={(id) => engineRef.current?.selectDrone(id)}
                environment={environment}
              />
            </div>

            {/* Right Side: FLIR Thermal Optical + Target Card */}
            <div
              className={`flex flex-col gap-2.5 transition-all duration-300 ${
                viewMode === 'FLIR_FOCUS'
                  ? 'col-span-12'
                  : viewMode === 'RADAR_FOCUS'
                  ? 'hidden'
                  : 'col-span-12 xl:col-span-4'
              }`}
            >
              <div className="h-[220px]">
                <FLIRViewport selectedDrone={selectedDrone} environment={environment} />
              </div>
              <div className="flex-1">
                <TargetTrackCard
                  selectedDrone={selectedDrone}
                  onClassify={(typeKey) => engineRef.current?.classifySelectedDrone(typeKey)}
                  onSetPriority={(pri) => engineRef.current?.setPrioritySelectedDrone(pri)}
                />
              </div>
            </div>
          </div>

          {/* Bottom Weapon Console Controls */}
          <div className="h-auto">
            <WeaponConsole
              selectedDrone={selectedDrone}
              rfJammerActive={rfJammerActive}
              rfJammerAzimuth={rfJammerAzimuth}
              rfJammerElevation={engineState.rfJammerElevation ?? 15}
              gnssSpooferActive={gnssSpooferActive}
              kineticAmmo={kineticAmmo}
              onToggleJammer={handleToggleJammer}
              onSetJammerAngle={(az, el) => engineRef.current?.setJammerAngle(az, el)}
              onFireKinetic={handleFireKinetic}
              onToggleSpoofer={() => engineRef.current?.toggleGnssSpoofer()}
            />
          </div>
        </section>
      </main>

      {/* ════ MODALS ════ */}
      <MissionBriefingModal
        isOpen={briefingOpen}
        currentScenario={scenario}
        onSelectScenario={(id) => {
          engineRef.current?.loadScenario(id);
        }}
        onStart={() => setBriefingOpen(false)}
        onClose={() => setBriefingOpen(false)}
      />

      <AARDebriefModal
        isOpen={aarOpen}
        metrics={metrics}
        scenario={scenario}
        onRestart={() => {
          setAarOpen(false);
          engineRef.current?.resetSimulation();
        }}
        onClose={() => setAarOpen(false)}
      />
    </div>
  );
}
