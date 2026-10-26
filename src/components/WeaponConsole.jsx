import React from 'react';
import { Zap, Crosshair, Navigation, Shield, Compass, Radio } from 'lucide-react';

export default function WeaponConsole({
  selectedDrone = null,
  rfJammerActive = false,
  rfJammerAzimuth = 0,
  gnssSpooferActive = false,
  kineticAmmo = 8,
  onToggleJammer = () => {},
  onSetJammerAngle = () => {},
  onFireKinetic = () => {},
  onToggleSpoofer = () => {}
}) {
  // Auto-Aim Jammer Azimuth directly at selected target
  const handleSnapToTarget = () => {
    if (!selectedDrone) return;
    const toDrone = selectedDrone.position;
    const angleDeg = Math.round((Math.atan2(toDrone.x, toDrone.z) * 180 / Math.PI + 360) % 360);
    onSetJammerAngle(angleDeg);
  };

  const jamProgress = selectedDrone ? Math.min(100, Math.round((selectedDrone.jamDwellTimer / 2.5) * 100)) : 0;

  return (
    <div className="tactical-panel w-full p-3 flex flex-col md:flex-row gap-4 items-center justify-between">
      {/* ── Weapon 1: Directional RF Jammer (Soft-Kill) ── */}
      <div className="flex-1 w-full bg-black/40 p-2.5 rounded border border-[var(--border-subtle)] flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Radio size={14} className="text-[#00e5ff]" />
            <span className="text-[11px] font-bold mono-hud text-[#00e5ff] uppercase">
              WEAPON 1: DIRECTIONAL RF JAMMER (SOFT-KILL)
            </span>
          </div>
          <span className="text-[10px] mono-hud text-gray-400">BEAM: 15° CONE</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <Compass size={14} className="text-[#d4af37]" />
            <input
              type="range"
              min="0"
              max="359"
              value={rfJammerAzimuth}
              onChange={(e) => onSetJammerAngle(Number(e.target.value))}
              className="w-full accent-[#00e5ff] cursor-pointer"
            />
            <span className="text-[11px] mono-hud text-[#00e5ff] min-w-[38px] text-right">
              {rfJammerAzimuth}°
            </span>
          </div>

          <button
            onClick={handleSnapToTarget}
            disabled={!selectedDrone}
            className="btn-tactical py-1 px-2 text-[10px] whitespace-nowrap disabled:opacity-40"
          >
            SNAP TO TARGET
          </button>

          <button
            onClick={() => onToggleJammer()}
            className={`btn-tactical py-1.5 px-3 text-[11px] font-bold ${
              rfJammerActive
                ? 'bg-[#00e5ff] text-black border-[#00e5ff] shadow-[0_0_15px_rgba(0,229,255,0.6)] animate-pulse'
                : 'btn-ew'
            }`}
          >
            {rfJammerActive ? 'TRANSMITTING BEAM' : 'EMIT RF JAMMER'}
          </button>
        </div>

        {/* Dwell Lock Progress Bar */}
        <div className="flex items-center gap-2 pt-1">
          <span className="text-[9px] mono-hud text-gray-400">LOCK DWELL:</span>
          <div className="flex-1 bg-black/60 h-2 rounded overflow-hidden">
            <div
              className="h-full bg-[#00e5ff] transition-all duration-150"
              style={{ width: `${jamProgress}%` }}
            />
          </div>
          <span className="text-[9px] mono-hud text-[#00e5ff] min-w-[28px]">
            {jamProgress}%
          </span>
        </div>
      </div>

      {/* ── Weapon 2: Kinetic Net Interceptor Pod (Hard-Kill) ── */}
      <div className="w-full md:w-auto bg-black/40 p-2.5 rounded border border-[var(--border-subtle)] flex flex-col gap-2 min-w-[260px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Crosshair size={14} className="text-[#ff2a3b]" />
            <span className="text-[11px] font-bold mono-hud text-[#ff2a3b] uppercase">
              WEAPON 2: KINETIC NET POD
            </span>
          </div>
          <span className="text-[10px] mono-hud text-[#d4af37]">
            AMMO: {kineticAmmo}/8
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className={`w-2.5 h-5 rounded-sm ${
                  i < kineticAmmo ? 'bg-[#d4af37]' : 'bg-gray-800'
                }`}
              />
            ))}
          </div>

          <button
            onClick={() => selectedDrone && onFireKinetic(selectedDrone.id)}
            disabled={!selectedDrone || kineticAmmo <= 0 || selectedDrone.state === 'NEUTRALIZED'}
            className="btn-tactical btn-hostile py-1.5 px-4 text-[11px] font-bold disabled:opacity-40"
          >
            FIRE INTERCEPTOR
          </button>
        </div>
      </div>

      {/* ── Weapon 3: GNSS Coordinated Spoofer ── */}
      <div className="w-full md:w-auto bg-black/40 p-2.5 rounded border border-[var(--border-subtle)] flex flex-col gap-2 min-w-[210px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Navigation size={14} className="text-[#d4af37]" />
            <span className="text-[11px] font-bold mono-hud text-[#d4af37] uppercase">
              GNSS AREA SPOOFER
            </span>
          </div>
          <span className={`text-[9px] mono-hud ${gnssSpooferActive ? 'text-[#00ff66]' : 'text-gray-500'}`}>
            {gnssSpooferActive ? 'ACTIVE' : 'STANDBY'}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] text-gray-400 mono-hud">AREA DRIFT DISPERSION:</span>
          <button
            onClick={onToggleSpoofer}
            className={`btn-tactical py-1.5 px-3 text-[10px] font-bold ${
              gnssSpooferActive
                ? 'bg-[#d4af37] text-black border-[#d4af37] shadow-[0_0_12px_rgba(212,175,55,0.5)]'
                : ''
            }`}
          >
            {gnssSpooferActive ? 'ACTIVE SPOOF' : 'ENGAGE SPOOFER'}
          </button>
        </div>
      </div>
    </div>
  );
}
