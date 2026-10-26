import React from 'react';
import { Shield, MapPin, AlertCircle, Compass, Play, CloudRain, Moon } from 'lucide-react';
import { SCENARIO_PRESETS } from '../simulation/SwarmEngine.js';

export default function MissionBriefingModal({
  isOpen = false,
  currentScenario = {},
  onSelectScenario = () => {},
  onStart = () => {},
  onClose = () => {}
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="tactical-panel w-full max-w-3xl flex flex-col p-6 border-2 border-[var(--border-tactical)]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <Shield size={24} className="text-[#d4af37]" />
            <div>
              <div className="text-[15px] font-bold tracking-wider mono-hud text-white">
                DEFENCE SERVICES STAFF COLLEGE (DSSC)
              </div>
              <div className="text-[11px] text-[#d4af37] mono-hud">
                COUNTER-UAS THREAT SIMULATION MODULE // SELECT MISSION DOCTRINE
              </div>
            </div>
          </div>
          <span className="badge-gold">SIH26247</span>
        </div>

        {/* Scenario Selection Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-5">
          {SCENARIO_PRESETS.map((s) => {
            const isSelected = currentScenario.id === s.id;
            return (
              <div
                key={s.id}
                onClick={() => onSelectScenario(s.id)}
                className={`p-3.5 rounded border cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                  isSelected
                    ? 'bg-[#d4af37]/15 border-[#d4af37] shadow-[0_0_15px_rgba(212,175,55,0.35)]'
                    : 'bg-black/40 border-[var(--border-subtle)] hover:border-gray-600'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-white mono-hud">{s.name}</span>
                  </div>

                  <div className="flex items-center gap-1 text-[10px] text-gray-400 mono-hud mb-2">
                    <MapPin size={10} className="text-[#d4af37]" />
                    <span>{s.location}</span>
                  </div>

                  <div className="text-[10px] text-gray-300 leading-relaxed mb-3">
                    {s.description}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
                  <span className="text-[9px] font-bold text-[#ff2a3b] mono-hud">
                    {s.threatLevel}
                  </span>
                  <span className="text-[9px] mono-hud text-gray-400">
                    {s.threats.reduce((acc, t) => acc + t.count, 0)} THREAT UNITS
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Scenario Briefing Details */}
        <div className="bg-black/50 p-3 rounded border border-[var(--border-subtle)] text-[11px] mono-hud flex justify-between items-center mb-5">
          <div>
            <span className="text-gray-400">ACTIVE SCENARIO: </span>
            <span className="text-[#d4af37] font-bold">{currentScenario.name}</span>
          </div>
          <div className="flex gap-3 text-gray-400">
            <span>ENV: {currentScenario.weather || 'CLEAR'}</span>
            <span>FLIR MODE: {currentScenario.nightMode ? 'NIGHT (BHOT/WHOT)' : 'DAYTIME'}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-[var(--border-subtle)]">
          <button
            onClick={onStart}
            className="btn-tactical py-2 px-6 text-[12px] bg-[#d4af37] text-black font-bold hover:bg-[#f3cf58] shadow-[0_0_15px_rgba(212,175,55,0.4)]"
          >
            <Play size={14} />
            COMMENCE TACTICAL DRILL
          </button>
        </div>
      </div>
    </div>
  );
}
