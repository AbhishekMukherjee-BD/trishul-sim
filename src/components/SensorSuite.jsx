import React from 'react';
import * as THREE from 'three';
import { Radio, Activity, Volume2, ShieldAlert, CloudFog } from 'lucide-react';

const SENSOR_ORIGIN = new THREE.Vector3(0, 0, 0);

export default function SensorSuite({
  drones = [],
  selectedDrone = null,
  environment = {},
  onAcousticAoAChange = () => {}
}) {
  // Compute RF spectrum power using Friis transmission equation
  const calculatePrx = (freqGhz, distMeters) => {
    const d = Math.max(30, distMeters);
    // Friis Path Loss: FSPL = 20*log10(d) + 20*log10(f_MHz) - 27.55
    // Assumes +27 dBm (500mW) transmitter and 6 dBi C-UAS receiver dish
    const fspl = 20 * Math.log10(d) + 20 * Math.log10(freqGhz * 1000) - 27.55;
    const pRx = 33 - fspl;
    return Math.max(-105, Math.min(-35, Math.round(pRx)));
  };

  let p24 = -95;
  let p58 = -92;
  let p900 = -98;
  const detectedAcoustic = {
    quad: false,
    fpv: false,
    wing: false
  };

  let nearestAcousticDist = 99999;
  let computedAcousticAoA = null;

  drones.forEach(d => {
    if (d.state === 'NEUTRALIZED') return;
    const dist = d.position.distanceTo(SENSOR_ORIGIN);

    if (d.type.id === 'QUADCOPTER') {
      p24 = Math.max(p24, calculatePrx(2.4, dist));
      if (dist <= 650) {
        detectedAcoustic.quad = true; // Physical limit: viscous air absorption
        if (dist < nearestAcousticDist) {
          nearestAcousticDist = dist;
          computedAcousticAoA = Math.round((Math.atan2(d.position.x, d.position.z) * 180 / Math.PI + 360) % 360);
        }
      }
    } else if (d.type.id === 'FPV_KAMIKAZE') {
      p58 = Math.max(p58, calculatePrx(5.8, dist));
      if (dist <= 650) {
        detectedAcoustic.fpv = true;
        if (dist < nearestAcousticDist) {
          nearestAcousticDist = dist;
          computedAcousticAoA = Math.round((Math.atan2(d.position.x, d.position.z) * 180 / Math.PI + 360) % 360);
        }
      }
    } else if (d.type.id === 'LOITERING_MUNITION') {
      p900 = Math.max(p900, calculatePrx(0.9, dist));
      if (dist <= 650) {
        detectedAcoustic.wing = true;
        if (dist < nearestAcousticDist) {
          nearestAcousticDist = dist;
          computedAcousticAoA = Math.round((Math.atan2(d.position.x, d.position.z) * 180 / Math.PI + 360) % 360);
        }
      }
    }
  });

  React.useEffect(() => {
    onAcousticAoAChange(computedAcousticAoA);
  }, [computedAcousticAoA]);

  // MAVLink v2.0 Protocol Bridge Telemetry
  const [mavlinkStatus, setMavlinkStatus] = React.useState({
    online: false,
    protocol: 'MAVLink v2.0',
    packets: 0
  });

  React.useEffect(() => {
    const isLocalhost = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    if (!isLocalhost || window.location.protocol === 'https:') {
      // In cloud production deployment (Vercel), operate in synthetic telemetry mode without triggering browser loopback CORS
      setMavlinkStatus({
        online: true,
        protocol: 'MAVLink v2.0 (CLOUD)',
        packets: 2
      });
      return;
    }

    const controller = new AbortController();
    fetch('http://localhost:8000/api/mavlink/sample_packets', { signal: controller.signal })
      .then(res => res.json())
      .then(data => {
        if (data && data.packets) {
          setMavlinkStatus({
            online: true,
            protocol: data.protocol || 'MAVLink v2.0',
            packets: data.packets.length
          });
        }
      })
      .catch(() => {
        setMavlinkStatus({
          online: false,
          protocol: 'MAVLink v2.0 (EMULATED)',
          packets: 2
        });
      });
    return () => controller.abort();
  }, []);

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
        <div className="flex items-center gap-1.5">
          <span className={`text-[8px] mono-hud px-1.5 py-0.5 rounded border ${
            mavlinkStatus.online
              ? 'bg-[#00ff66]/10 border-[#00ff66] text-[#00ff66]'
              : 'bg-white/5 border-[var(--border-subtle)] text-gray-400'
          }`}>
            {mavlinkStatus.online ? 'MAVLINK v2.0 LIVE' : 'MAVLINK v2.0 STANDALONE'}
          </span>
          <span className="badge-radar text-[9px]">ONLINE</span>
        </div>
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
          <span className="text-[9px] mono-hud text-[#00ff66]">
            {computedAcousticAoA !== null ? `AoA: ${computedAcousticAoA}° (±3° TDoA)` : 'MULTI-BEAM FFT'}
          </span>
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
