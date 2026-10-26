import React from 'react';
import * as THREE from 'three';
import { Radio, Activity, Volume2, ShieldAlert, CloudFog } from 'lucide-react';

const SENSOR_ORIGIN = new THREE.Vector3(0, 0, 0);

export default function SensorSuite({
  drones = [],
  selectedDrone = null,
  environment = {}
}) {
  // Compute RF spectrum power based on drone proximities
  let p24 = -95;
  let p58 = -92;
  let p900 = -98;
  const detectedAcoustic = {
    quad: false,
    fpv: false,
    wing: false
  };

  drones.forEach(d => {
    if (d.state === 'NEUTRALIZED') return;
    const dist = d.position.distanceTo(SENSOR_ORIGIN);
    const factor = Math.max(0, 1 - dist / 5000);

    if (d.type.id === 'QUADCOPTER') {
      p24 = Math.max(p24, Math.round(-95 + factor * 50));
      detectedAcoustic.quad = true;
    } else if (d.type.id === 'FPV_KAMIKAZE') {
      p58 = Math.max(p58, Math.round(-92 + factor * 55));
      detectedAcoustic.fpv = true;
    } else if (d.type.id === 'LOITERING_MUNITION') {
      p900 = Math.max(p900, Math.round(-98 + factor * 45));
      detectedAcoustic.wing = true;
    }
  });

  return (
    <div className="tactical-panel w-full flex flex-col gap-3 p-3">
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-[#00ff66]" />
          <span className="text-[11px] font-bold tracking-wider mono-hud text-[#00ff66]">
            INTEGRATED SENSOR SUITE
          </span>
        </div>
        <span className="badge-radar text-[9px]">ONLINE</span>
      </div>

      {/* 1. Primary 3D Radar Status */}
      <div className="flex flex-col gap-1 text-[11px] mono-hud">
        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
          Primary 3D AESA Radar
        </div>
        <div className="flex justify-between text-gray-300">
          <span>Sweep Mode:</span>
          <span className="text-[#d4af37]">360° PPI // 30 RPM</span>
        </div>
        <div className="flex justify-between text-gray-300">
          <span>Target Tracks:</span>
          <span className="text-[#00ff66] font-bold">{drones.length} ACTIVE</span>
        </div>
        <div className="flex justify-between text-gray-300">
          <span>Clutter Filter:</span>
          <span className="text-gray-400">{environment.fogDensity > 0 ? 'ADAPTIVE MTI' : 'NORMAL'}</span>
        </div>
      </div>

      {/* 2. RF Direction Finder & Spectrum Analyzer */}
      <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-subtle)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            <Radio size={12} className="text-[#00e5ff]" />
            <span>RF Spectrum Waterfall</span>
          </div>
          <span className="text-[9px] mono-hud text-[#00e5ff]">DF BEARING LOCK</span>
        </div>

        {/* 2.4 GHz Commercial Band */}
        <div className="flex flex-col gap-0.5">
          <div className="flex justify-between text-[10px] mono-hud">
            <span className="text-gray-300">2.4 GHz ISM (C2 Link):</span>
            <span className={p24 > -65 ? 'text-[#ffaa00] font-bold' : 'text-gray-400'}>
              {p24} dBm
            </span>
          </div>
          <div className="w-full bg-black/60 h-1.5 rounded overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#00ff66] via-[#ffaa00] to-[#ff2a3b] transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(5, (p24 + 100) * 1.8))}%` }}
            />
          </div>
        </div>

        {/* 5.8 GHz FPV Analog Video Band */}
        <div className="flex flex-col gap-0.5">
          <div className="flex justify-between text-[10px] mono-hud">
            <span className="text-gray-300">5.8 GHz VTX (FPV Feed):</span>
            <span className={p58 > -65 ? 'text-[#ff2a3b] font-bold animate-pulse' : 'text-gray-400'}>
              {p58} dBm
            </span>
          </div>
          <div className="w-full bg-black/60 h-1.5 rounded overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#00ff66] via-[#ffaa00] to-[#ff2a3b] transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(5, (p58 + 100) * 1.8))}%` }}
            />
          </div>
        </div>

        {/* 900 MHz LoRa/Telemetry Band */}
        <div className="flex flex-col gap-0.5">
          <div className="flex justify-between text-[10px] mono-hud">
            <span className="text-gray-300">868/915 MHz (LoRa C2):</span>
            <span className={p900 > -70 ? 'text-[#d4af37] font-bold' : 'text-gray-400'}>
              {p900} dBm
            </span>
          </div>
          <div className="w-full bg-black/60 h-1.5 rounded overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#00ff66] via-[#d4af37] to-[#ff2a3b] transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(5, (p900 + 100) * 1.8))}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3. Multi-Channel Acoustic Array Spectral Analysis */}
      <div className="flex flex-col gap-1.5 pt-2 border-t border-[var(--border-subtle)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            <Volume2 size={12} className="text-[#d4af37]" />
            <span>Acoustic Array</span>
          </div>
          <span className="text-[9px] mono-hud text-[#00ff66]">MULTI-BEAM FFT</span>
        </div>

        <div className="grid grid-cols-3 gap-1 text-[9px] mono-hud">
          <div className={`p-1 rounded border text-center ${
            detectedAcoustic.quad 
              ? 'bg-[#ffaa00]/15 border-[#ffaa00] text-[#ffaa00] font-bold' 
              : 'bg-black/40 border-[var(--border-subtle)] text-gray-500'
          }`}>
            5.2 kHz (QUAD)
          </div>
          <div className={`p-1 rounded border text-center ${
            detectedAcoustic.fpv 
              ? 'bg-[#ff2a3b]/15 border-[#ff2a3b] text-[#ff2a3b] font-bold animate-pulse' 
              : 'bg-black/40 border-[var(--border-subtle)] text-gray-500'
          }`}>
            7.8 kHz (FPV)
          </div>
          <div className={`p-1 rounded border text-center ${
            detectedAcoustic.wing 
              ? 'bg-[#d4af37]/15 border-[#d4af37] text-[#d4af37] font-bold' 
              : 'bg-black/40 border-[var(--border-subtle)] text-gray-500'
          }`}>
            3.4 kHz (WING)
          </div>
        </div>

        <div className="text-[9px] mono-hud text-gray-400 bg-black/40 px-2 py-1 rounded border border-[var(--border-subtle)]">
          {detectedAcoustic.fpv ? (
            <span className="text-[#ff2a3b] font-bold">
              ALERT: HIGH-RPM BRUSHLESS SIGNATURE // PROBABLE FPV DIVE
            </span>
          ) : detectedAcoustic.quad ? (
            <span className="text-[#ffaa00]">
              COAXIAL 4-ROTOR HARMONIC // QUADCOPTER INGRESS
            </span>
          ) : detectedAcoustic.wing ? (
            <span className="text-[#d4af37]">
              LOW-RPM PUSHER PROP HARMONIC // FIXED-WING CRUISE
            </span>
          ) : (
            <span>ACOUSTIC SPECTRUM BELOW DETECTION THRESHOLD</span>
          )}
        </div>
      </div>
    </div>
  );
}
