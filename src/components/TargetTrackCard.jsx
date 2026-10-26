import React from 'react';
import * as THREE from 'three';
import { Target, AlertTriangle, ShieldCheck, CheckCircle2, XCircle } from 'lucide-react';
import { THREAT_TYPES, AGENT_STATES } from '../simulation/DroneAgent.js';

const TRACK_ORIGIN = new THREE.Vector3(0, 0, 0);

export default function TargetTrackCard({
  selectedDrone = null,
  onClassify = () => {},
  onSetPriority = () => {}
}) {
  if (!selectedDrone) {
    return (
      <div className="tactical-panel w-full p-4 flex flex-col items-center justify-center text-center text-gray-500 min-h-[220px]">
        <Target size={28} className="mb-2 text-[#d4af37] opacity-40 animate-pulse" />
        <div className="text-[12px] mono-hud text-gray-400">NO TARGET ACQUIRED</div>
        <div className="text-[10px] text-gray-600 mt-1">
          Select a contact on the 3D Radar or list to lock tracking telemetry.
        </div>
      </div>
    );
  }

  const distMeters = Math.round(
    selectedDrone.position.distanceTo(TRACK_ORIGIN)
  );
  const altMeters = Math.round(selectedDrone.altitude);
  const speedMs = selectedDrone.velocity.length();
  const speedKmh = Math.round(speedMs * 3.6); // M4: Military standard km/h
  const headingDeg = Math.round((selectedDrone.heading + 360) % 360);

  // Status color
  let statusBadge = (
    <span className="badge-hostile">{selectedDrone.state}</span>
  );
  if (selectedDrone.state === AGENT_STATES.JAMMED_RTH) {
    statusBadge = <span className="badge-gold">JAMMED // RETREATING</span>;
  } else if (selectedDrone.state === AGENT_STATES.NEUTRALIZED) {
    statusBadge = <span className="badge-radar">NEUTRALIZED</span>;
  } else if (selectedDrone.state === AGENT_STATES.BREACHED) {
    statusBadge = <span className="bg-red-600 text-white font-bold text-[9px] px-1.5 py-0.5 rounded">PERIMETER BREACH</span>;
  }

  return (
    <div className="tactical-panel w-full flex flex-col gap-3 p-3 tactical-corner-tl">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <Target size={14} className="text-[#ff2a3b]" />
          <span className="text-[12px] font-bold tracking-wider mono-hud text-white">
            TRACK: {selectedDrone.id}
          </span>
        </div>
        {statusBadge}
      </div>

      {/* Primary Kinematic Telemetry Grid */}
      <div className="grid grid-cols-2 gap-2 text-[11px] mono-hud bg-black/40 p-2.5 rounded border border-[var(--border-subtle)]">
        <div>
          <span className="text-gray-400">SLANT RANGE:</span>
          <div className="text-white font-bold text-[13px]">{distMeters} M</div>
        </div>
        <div>
          <span className="text-gray-400">ALTITUDE:</span>
          <div className="text-white font-bold text-[13px]">{altMeters} M AGL</div>
        </div>
        <div>
          <span className="text-gray-400">SPEED:</span>
          <div className="text-[#00e5ff] font-bold text-[13px]">{speedKmh} KM/H</div>
        </div>
        <div>
          <span className="text-gray-400">HEADING:</span>
          <div className="text-[#d4af37] font-bold text-[13px]">{headingDeg}° MAG</div>
        </div>
        <div>
          <span className="text-gray-400">RADAR RCS:</span>
          <div className="text-gray-300">{selectedDrone.type.rcs_dbsm} dBsm</div>
        </div>
        <div>
          <span className="text-gray-400">RF CONTROL:</span>
          <div className="text-gray-300">{selectedDrone.type.baseFrequency}</div>
        </div>
      </div>

      {/* Trainee Threat Classification Task */}
      <div className="flex flex-col gap-1.5 pt-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 mono-hud">
            DSSC CLASSIFICATION TEST
          </span>
          {selectedDrone.classifiedAs && (
            <span className="text-[9px] mono-hud flex items-center gap-1">
              {selectedDrone.classifiedAs === selectedDrone.type.id ? (
                <span className="text-[#00ff66] flex items-center gap-0.5">
                  <CheckCircle2 size={10} /> CORRECT
                </span>
              ) : (
                <span className="text-[#ff2a3b] flex items-center gap-0.5">
                  <XCircle size={10} /> INCORRECT
                </span>
              )}
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={() => onClassify('QUADCOPTER')}
            className={`btn-tactical py-1.5 text-[9px] ${
              selectedDrone.classifiedAs === 'QUADCOPTER'
                ? 'bg-[#d4af37] text-black font-bold'
                : ''
            }`}
          >
            QUADCOPTER
          </button>
          <button
            onClick={() => onClassify('FPV_KAMIKAZE')}
            className={`btn-tactical py-1.5 text-[9px] ${
              selectedDrone.classifiedAs === 'FPV_KAMIKAZE'
                ? 'bg-[#ff2a3b] text-white font-bold'
                : ''
            }`}
          >
            FPV KAMIKAZE
          </button>
          <button
            onClick={() => onClassify('LOITERING_MUNITION')}
            className={`btn-tactical py-1.5 text-[9px] ${
              selectedDrone.classifiedAs === 'LOITERING_MUNITION'
                ? 'bg-[#00e5ff] text-black font-bold'
                : ''
            }`}
          >
            FIXED WING
          </button>
        </div>
      </div>

      {/* Threat Priority Level */}
      <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
        <span className="text-[10px] text-gray-400 mono-hud font-bold">TACTICAL PRIORITY:</span>
        <div className="flex gap-1">
          {['ALPHA', 'BRAVO', 'CHARLIE'].map(p => (
            <button
              key={p}
              onClick={() => onSetPriority(p)}
              className={`px-2 py-0.5 text-[9px] font-mono rounded ${
                selectedDrone.priority === p
                  ? p === 'ALPHA'
                    ? 'bg-[#ff2a3b] text-white font-bold'
                    : 'bg-[#d4af37] text-black font-bold'
                  : 'bg-black/40 text-gray-400 hover:text-white'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
