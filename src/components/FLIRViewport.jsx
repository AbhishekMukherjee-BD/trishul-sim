import React, { useState, useEffect, useRef } from 'react';
import { Camera, Crosshair, ZoomIn, Eye, Sparkles } from 'lucide-react';
import { FLIR_MODES } from '../shaders/thermalShader';

export default function FLIRViewport({ selectedDrone = null, environment = {} }) {
  const [thermalMode, setThermalMode] = useState(FLIR_MODES.WHITE_HOT);
  const [zoomLevel, setZoomLevel] = useState(4); // 1x, 4x, 12x
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const noiseTickRef = useRef(0);
  const lastDroneIdRef = useRef(null);
  const slewOffsetRef = useRef({ x: 0, y: 0 });

  // Dynamic gimbal slew simulation on target acquisition
  useEffect(() => {
    if (selectedDrone && selectedDrone.id !== lastDroneIdRef.current) {
      lastDroneIdRef.current = selectedDrone.id;
      slewOffsetRef.current = {
        x: (Math.random() - 0.5) * 70,
        y: (Math.random() - 0.5) * 50
      };
    }
  }, [selectedDrone?.id]);

  // Dynamic canvas sizing
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      const w = Math.max(320, Math.floor(rect.width));
      const h = Math.max(180, Math.floor(rect.height));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };
    resizeCanvas();
    const ro = new ResizeObserver(resizeCanvas);
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // Simulated thermal render loop on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let frameId;
    let tick = 0;

    const render = () => {
      frameId = requestAnimationFrame(render);
      tick += 0.05;
      noiseTickRef.current++;

      const w = canvas.width;
      const h = canvas.height;

      // 1. Background base thermal field
      ctx.fillStyle = thermalMode === FLIR_MODES.BLACK_HOT ? '#ffffff' : '#04070a';
      ctx.fillRect(0, 0, w, h);

      // Atmospheric Fog & Moisture Extinction (Mie scattering in 3-5µm MWIR band)
      const isFoggy = environment && environment.fogDensity > 0;
      if (isFoggy) {
        ctx.fillStyle = thermalMode === FLIR_MODES.BLACK_HOT 
          ? 'rgba(200, 200, 200, 0.4)' 
          : thermalMode === FLIR_MODES.NVG_GREEN
          ? 'rgba(0, 50, 20, 0.4)'
          : 'rgba(20, 26, 36, 0.4)';
        ctx.fillRect(0, 0, w, h);
      }

      // 2. Efficient grain noise via semi-transparent random rectangles (every 3rd frame)
      if (noiseTickRef.current % 3 === 0) {
        const noiseCount = isFoggy ? 95 : 60;
        for (let i = 0; i < noiseCount; i++) {
          const nx = Math.random() * w;
          const ny = Math.random() * h;
          const ns = 2 + Math.random() * 6;
          const alpha = 0.03 + Math.random() * 0.06;
          if (thermalMode === FLIR_MODES.NVG_GREEN) {
            ctx.fillStyle = `rgba(0, 80, 30, ${alpha})`;
          } else if (thermalMode === FLIR_MODES.IRONBOW) {
            ctx.fillStyle = `rgba(30, 0, 50, ${alpha})`;
          } else if (thermalMode === FLIR_MODES.BLACK_HOT) {
            ctx.fillStyle = `rgba(200, 200, 200, ${alpha})`;
          } else {
            ctx.fillStyle = `rgba(20, 25, 30, ${alpha})`;
          }
          ctx.fillRect(nx, ny, ns, ns);
        }
      }

      // 3. Render Target if active
      if (selectedDrone && selectedDrone.state !== 'NEUTRALIZED') {
        // Gimbal pan slew damping towards optical center
        slewOffsetRef.current.x *= 0.92;
        slewOffsetRef.current.y *= 0.92;

        const tgtX = w / 2 + Math.sin(tick * 0.8) * 8 + slewOffsetRef.current.x;
        const tgtY = h / 2 + Math.cos(tick * 0.6) * 6 + slewOffsetRef.current.y;
        
        // Dynamic slant range scaling: target is larger up close, smaller at distance
        const distM = selectedDrone.position ? selectedDrone.position.distanceTo({ x: 0, y: 0, z: 0 }) : 3000;
        const rangeScale = Math.max(0.45, Math.min(2.4, 2600 / Math.max(400, distM)));
        const size = Math.max(14, Math.min(105, 34 * (zoomLevel / 4.0) * rangeScale));
        const droneType = selectedDrone.type ? selectedDrone.type.id : 'QUADCOPTER';

        // Bank tilt based on velocity direction
        const bankAngle = Math.sin(tick * 0.5) * 0.12;

        ctx.save();
        ctx.translate(tgtX, tgtY);
        ctx.rotate(bankAngle);

        // Core thermal heat bloom (glow)
        const radGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, size * 1.6);
        if (thermalMode === FLIR_MODES.BLACK_HOT) {
          radGrad.addColorStop(0, '#000000');
          radGrad.addColorStop(0.5, '#444444');
          radGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        } else if (thermalMode === FLIR_MODES.IRONBOW) {
          radGrad.addColorStop(0, '#ffffff');
          radGrad.addColorStop(0.25, '#ffcc00');
          radGrad.addColorStop(0.6, '#ff0033');
          radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        } else if (thermalMode === FLIR_MODES.NVG_GREEN) {
          radGrad.addColorStop(0, '#ccffcc');
          radGrad.addColorStop(0.45, '#00ff66');
          radGrad.addColorStop(1, 'rgba(0, 50, 20, 0)');
        } else {
          radGrad.addColorStop(0, '#ffffff');
          radGrad.addColorStop(0.5, '#aaaaaa');
          radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        }

        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.arc(0, 0, size * 1.6, 0, Math.PI * 2);
        ctx.fill();

        // Airframe line styling
        const frameColor = thermalMode === FLIR_MODES.BLACK_HOT ? '#000000' : '#ffffff';
        const hotSpotColor = thermalMode === FLIR_MODES.BLACK_HOT 
          ? '#000000' 
          : thermalMode === FLIR_MODES.IRONBOW 
          ? '#ffffcc' 
          : '#ffea75';

        ctx.strokeStyle = frameColor;
        ctx.lineWidth = 2;

        if (droneType === 'LOITERING_MUNITION') {
          // ── TYPE A: FIXED-WING LOITERING MUNITION (Swept Delta-Wing + Pusher Engine) ──
          ctx.beginPath();
          // Main fuselage
          ctx.moveTo(0, -size * 0.9);
          ctx.lineTo(0, size * 0.7);
          // Swept-back main wings
          ctx.moveTo(0, -size * 0.2);
          ctx.lineTo(-size * 1.5, size * 0.3);
          ctx.moveTo(0, -size * 0.2);
          ctx.lineTo(size * 1.5, size * 0.3);
          // V-Tail stabilizers
          ctx.moveTo(0, size * 0.6);
          ctx.lineTo(-size * 0.6, size * 0.85);
          ctx.moveTo(0, size * 0.6);
          ctx.lineTo(size * 0.6, size * 0.85);
          ctx.stroke();

          // Intense rear engine thermal exhaust plume
          ctx.fillStyle = hotSpotColor;
          ctx.beginPath();
          ctx.arc(0, size * 0.75, Math.max(3, size * 0.14), 0, Math.PI * 2);
          ctx.fill();

        } else if (droneType === 'FPV_KAMIKAZE') {
          // ── TYPE B: FPV KAMIKAZE (Compact Diagonal X-Frame + High-RPM Motor Blooms) ──
          ctx.beginPath();
          // Diagonal X struts
          ctx.moveTo(-size * 0.75, -size * 0.75);
          ctx.lineTo(size * 0.75, size * 0.75);
          ctx.moveTo(-size * 0.75, size * 0.75);
          ctx.lineTo(size * 0.75, -size * 0.75);
          // Forward payload camera nose
          ctx.moveTo(0, -size * 0.4);
          ctx.lineTo(0, -size * 0.85);
          ctx.stroke();

          // 4 Motor Hot Spots
          const fpvMotors = [
            [-size * 0.75, -size * 0.75],
            [size * 0.75, -size * 0.75],
            [-size * 0.75, size * 0.75],
            [size * 0.75, size * 0.75]
          ];
          ctx.fillStyle = hotSpotColor;
          fpvMotors.forEach(([mx, my]) => {
            ctx.beginPath();
            ctx.arc(mx, my, Math.max(3, size * 0.1), 0, Math.PI * 2);
            ctx.fill();
          });

        } else {
          // ── TYPE C: COMMERCIAL QUADCOPTER (Cross-Boom + Central Avionics) ──
          ctx.beginPath();
          ctx.moveTo(-size * 0.8, 0);
          ctx.lineTo(size * 0.8, 0);
          ctx.moveTo(0, -size * 0.6);
          ctx.lineTo(0, size * 0.6);
          ctx.stroke();

          // Center payload pod
          ctx.fillStyle = frameColor;
          ctx.fillRect(-size * 0.15, -size * 0.2, size * 0.3, size * 0.4);

          // 4 Motor thermal nodes
          const quadMotors = [
            [-size * 0.75, 0],
            [size * 0.75, 0],
            [0, -size * 0.55],
            [0, size * 0.55]
          ];
          ctx.fillStyle = hotSpotColor;
          quadMotors.forEach(([mx, my]) => {
            ctx.beginPath();
            ctx.arc(mx, my, Math.max(3, size * 0.09), 0, Math.PI * 2);
            ctx.fill();
          });
        }

        ctx.restore();
      }

      // 4. Reticle & HUD Overlay (using distinct variable names to avoid scope clash)
      const hudColor = thermalMode === FLIR_MODES.NVG_GREEN ? '#00ff66' : '#d4af37';
      ctx.strokeStyle = hudColor;
      ctx.lineWidth = 1;

      const hudCx = w / 2;
      const hudCy = h / 2;
      ctx.beginPath();
      ctx.moveTo(hudCx - 30, hudCy);
      ctx.lineTo(hudCx - 10, hudCy);
      ctx.moveTo(hudCx + 10, hudCy);
      ctx.lineTo(hudCx + 30, hudCy);
      ctx.moveTo(hudCx, hudCy - 30);
      ctx.lineTo(hudCx, hudCy - 10);
      ctx.moveTo(hudCx, hudCy + 10);
      ctx.lineTo(hudCx, hudCy + 30);
      ctx.stroke();

      // Outer targeting brackets
      const bSize = 65;
      ctx.beginPath();
      ctx.moveTo(hudCx - bSize, hudCy - bSize + 15);
      ctx.lineTo(hudCx - bSize, hudCy - bSize);
      ctx.lineTo(hudCx - bSize + 15, hudCy - bSize);
      ctx.moveTo(hudCx + bSize - 15, hudCy - bSize);
      ctx.lineTo(hudCx + bSize, hudCy - bSize);
      ctx.lineTo(hudCx + bSize, hudCy - bSize + 15);
      ctx.moveTo(hudCx - bSize, hudCy + bSize - 15);
      ctx.lineTo(hudCx - bSize, hudCy + bSize);
      ctx.lineTo(hudCx - bSize + 15, hudCy + bSize);
      ctx.moveTo(hudCx + bSize - 15, hudCy + bSize);
      ctx.lineTo(hudCx + bSize, hudCy + bSize);
      ctx.lineTo(hudCx + bSize, hudCy + bSize - 15);
      ctx.stroke();
    };

    render();

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [thermalMode, zoomLevel, selectedDrone]);

  const distMeters = selectedDrone
    ? Math.round(selectedDrone.position.distanceTo({ x: 0, y: 0, z: 0 }))
    : '---';

  const altMeters = selectedDrone ? Math.round(selectedDrone.altitude) : '---';

  return (
    <div className="tactical-panel w-full h-full flex flex-col p-3 tactical-corner-tl">
      {/* Header controls */}
      <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <Camera size={14} className="text-[#d4af37]" />
          <span className="text-[11px] font-bold tracking-wider mono-hud text-[#d4af37]">
            OPTICAL FLIR // THERMAL TRACKER
          </span>
        </div>

        {/* Mode Toggles */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setThermalMode(FLIR_MODES.WHITE_HOT)}
            className={`px-2 py-0.5 text-[9px] font-mono rounded ${
              thermalMode === FLIR_MODES.WHITE_HOT
                ? 'bg-[#d4af37] text-black font-bold'
                : 'bg-black/40 text-gray-400 hover:text-white'
            }`}
          >
            WHOT
          </button>
          <button
            onClick={() => setThermalMode(FLIR_MODES.BLACK_HOT)}
            className={`px-2 py-0.5 text-[9px] font-mono rounded ${
              thermalMode === FLIR_MODES.BLACK_HOT
                ? 'bg-[#d4af37] text-black font-bold'
                : 'bg-black/40 text-gray-400 hover:text-white'
            }`}
          >
            BHOT
          </button>
          <button
            onClick={() => setThermalMode(FLIR_MODES.IRONBOW)}
            className={`px-2 py-0.5 text-[9px] font-mono rounded ${
              thermalMode === FLIR_MODES.IRONBOW
                ? 'bg-[#ff3366] text-white font-bold'
                : 'bg-black/40 text-gray-400 hover:text-white'
            }`}
          >
            IRONBOW
          </button>
          <button
            onClick={() => setThermalMode(FLIR_MODES.NVG_GREEN)}
            className={`px-2 py-0.5 text-[9px] font-mono rounded ${
              thermalMode === FLIR_MODES.NVG_GREEN
                ? 'bg-[#00ff66] text-black font-bold'
                : 'bg-black/40 text-gray-400 hover:text-white'
            }`}
          >
            NVG
          </button>
        </div>
      </div>

      {/* Canvas Viewport */}
      <div ref={containerRef} className="relative flex-1 w-full bg-black my-2 rounded overflow-hidden flex items-center justify-center">
        <canvas
          ref={canvasRef}
          className="w-full h-full object-cover"
        />

        {/* Optical Telemetry OSD */}
        <div className="absolute top-2 left-2 text-[10px] mono-hud text-[#00ff66] pointer-events-none drop-shadow">
          <div>FOV: {(35 / zoomLevel).toFixed(1)}° // {zoomLevel}X OPTICAL</div>
          <div>LRF: {distMeters} M</div>
          <div>ALT: {altMeters} M AGL</div>
        </div>

        <div className="absolute top-2 right-2 text-[10px] mono-hud text-[#d4af37] pointer-events-none drop-shadow text-right">
          <div>TRACK: {selectedDrone ? selectedDrone.id : 'SEARCHING'}</div>
          <div>LOCK: {selectedDrone ? 'AUTO-CORR' : 'STANDBY'}</div>
        </div>

        <div className="absolute bottom-2 left-2 text-[9px] mono-hud text-gray-400 pointer-events-none">
          SENSOR: MWIR 640x512 COOLED
        </div>

        {/* Zoom selector */}
        <div className="absolute bottom-2 right-2 flex gap-1 z-10">
          {[1, 4, 12].map(z => (
            <button
              key={z}
              onClick={() => setZoomLevel(z)}
              className={`px-1.5 py-0.5 text-[9px] font-mono rounded ${
                zoomLevel === z
                  ? 'bg-[#00ff66] text-black font-bold'
                  : 'bg-black/60 text-gray-400 hover:text-white'
              }`}
            >
              {z}X
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
