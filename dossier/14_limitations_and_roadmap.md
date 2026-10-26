# ═══════════════════════════════════════════════════════════════════════════════
# TRISHUL-SIM: LIMITATIONS, DISCREPANCIES & ROADMAP (14_limitations_and_roadmap.md)
# ═══════════════════════════════════════════════════════════════════════════════

## 1. HONEST TECHNICAL LIMITATIONS & SHORTCUTS

In accordance with Hackathon Rule R9, this section transparently documents technical constraints, simplifications, and mock elements in the current codebase:

| Limitation / Shortcut | Location in Codebase | Technical Nature & Impact | Mitigation / Future Scope |
|---|---|---|---|
| **Synthetic MAVLink Packets** | `server/app.py:L18-L50` | Telemetry packets are generated from a pre-structured array with dynamic timestamp modification rather than a live serial radio link. | Connect directly to physical SDRs (HackRF / RTL-SDR) via USB serial port in Phase 2. |
| **Simulated RF Waterfall** | `src/components/SensorSuite.jsx:L13-L33` | RF power levels (dBm) are computed using inverse-distance heuristics from drone positions rather than physical RF spectrum sweeps. | Interface with live software-defined radio (SDR) Fast Fourier Transform (FFT) streams. |
| **Single Active Interceptor Pod** | `src/simulation/SwarmEngine.js:L60` | Fixed to 8 kinetic rounds with 1 launcher origin `(0, 20, 0)`; does not model distributed multi-launcher batteries. | Model multi-node distributed CIWS batteries with individual azimuth/elevation limits. |
| **Acoustic Signature Model** | `src/components/SensorSuite.jsx:L16-L32` | Displays hardcoded motor whine frequencies (5,200 Hz, 7,800 Hz, 3,400 Hz) without real-time microphone FFT input. | Connect to physical acoustic microphone array for audio classification. |
| **Three.js Bundle Chunk Size** | `vite.config.js` | Single bundled JavaScript chunk is 786 KB (triggers Vite >500 KB build warning). | Implement Rollup manual chunking / dynamic imports for Three.js. |

---

## 2. DISCREPANCIES LOG (Rule R2: Code Beats Docs)

| Item | Documentation / Comment Claim | Actual Code Implementation | Final Verified Resolution |
|---|---|---|---|
| **AI Model Reference** | Legacy comments mentioned `llama3` | Code in `AARDebriefModal.jsx` and `server/app.py` calls `mistral` | `mistral:latest` is the active, verified model in `00_facts.md`. |
| **RF Jammer Envelope** | Older UI labels stated `3,500m` stand-off range | Code in `DroneAgent.js:L235` executes a `5,000.0m` range | Code verified: `5,000.0m` is standard Indian MoD envelope. |
| **Ollama Timeout** | Previous comments mentioned aggressive `1.5s` timeout | Code in `AARDebriefModal.jsx:L87` and `server/app.py:L132` sets `15.0s` | Code verified: 15s timeout allows full 7.2B LLM inference. |
| **Speed Display Units** | Initial designs used raw m/s | `TargetTrackCard.jsx` converts speed to military `km/h` (`* 3.6`) | Code verified: km/h is standard Indian military aviation metric. |

---

## 3. REALISTIC THREE-PHASE ROADMAP

### Phase 1: Sovereign Simulation Core (Current Grand Finale Deliverable — 100% Complete)
- [VERIFIED-RUN] 60 Hz Reynolds Boids autonomous multi-agent swarm physics engine.
- [VERIFIED-RUN] Dual synchronized viewports: 3D AESA Radar scope & EO/IR FLIR infrared camera.
- [VERIFIED-RUN] Tri-layer countermeasure suite: Directional RF Jammer, Kinetic Net Pod, GNSS Spoofer.
- [VERIFIED-RUN] On-device sovereign AI Directing Staff After-Action Review (Ollama Mistral).
- [VERIFIED-RUN] 100% offline air-gapped zero-cloud compliance with 38/38 passing tests.

### Phase 2: Hardware-in-the-Loop & Multi-Node C2 (Next 6 Months)
- [INFERRED] Integration of USB Software-Defined Radios (RTL-SDR / HackRF One) for live RF drone sniffing.
- [INFERRED] Distributed multi-battery point-defense layout with terrain elevation digital elevation models (DEM) for border sectors (Galwan, Pangong Tso, Rann of Kutch).
- [INFERRED] Live UDP/TCP bridge to QGroundControl and real autopilot hardware running PX4 / ArduPilot.

### Phase 3: VR/XR Tactical Command Immersive Environment (Next 12 Months)
- [INFERRED] WebXR integration for virtual reality command shelters and holographic radar tables.
- [INFERRED] Multi-trainee joint network exercises: radar operator, EW jammer specialist, and battery commander operating in a shared tactical battle-space.
