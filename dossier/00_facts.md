# ═══════════════════════════════════════════════════════════════════════════════
# TRISHUL-SIM: SINGLE SOURCE OF TRUTH (00_facts.md)
# ═══════════════════════════════════════════════════════════════════════════════
# All files in /dossier/ MUST strictly match the exact names, versions, ports,
# metrics, thresholds, and parameters established in this document.
# ═══════════════════════════════════════════════════════════════════════════════

## 1. SNAPSHOT PIN (Rule R7)
- [VERIFIED-READ] **Local Workspace Directory**: `/Users/abhishekmukherjee/Developer/hanku `
- [VERIFIED-READ] **Snapshot Timestamp**: `2026-10-20T10:07:15+05:30`
- [NOT-FOUND] **Git Commit Hash**: Directory is not a git repository (`.git` absent); untracked local codebase snapshot.
- [NOT-FOUND] **Git Branch**: None (untracked local workspace).
- [VERIFIED-READ] **Uncommitted Changes**: All files in workspace are active working files as of the timestamp above.

---

## 2. PROJECT IDENTITY & SMART INDIA HACKATHON CONTEXT
- [VERIFIED-READ] **Project Name**: Project TRISHUL-SIM (`trishul-sim`) (from `package.json:L2`, `README.md:L1`)
- [VERIFIED-READ] **Project Subtitle**: AI-Enabled Drone & Counter-Drone Threat Simulation Trainer (from `package.json:L6`, `README.md:L3`)
- [VERIFIED-READ] **SIH Problem Statement ID**: `SIH26247` (from `README.md:L3`, `src/App.jsx:L210`, `index.html:L8`)
- [VERIFIED-READ] **Target Organization**: Ministry of Defence (MoD) / Defence Services Staff College (DSSC), Wellington (from `README.md:L3`, `server/app.py:L4`)
- [NEEDS-USER-INPUT] **SIH PS Category**: Software (`PS Category- Software` per `t/SIH2026-IDEA-Presentation-Format.pptx:Slide 1`)
- [NEEDS-USER-INPUT] **SIH Theme**: Defence / Drone & Counter-Drone / Robotics
- [NEEDS-USER-INPUT] **Team Name**: Duoflow (confirmed by user in Phase 0 response)
- [NEEDS-USER-INPUT] **Team ID**: `[NEEDS-USER-INPUT]` (to be provided from SIH portal registration)
- [NEEDS-USER-INPUT] **Team Members & College**: `[NEEDS-USER-INPUT]`
- [VERIFIED-READ] **SIH Stage**: Idea Submission (`t/SIH2026-IDEA-Presentation-Format.pptx:Slide 1-7`)

---

## 3. NETWORKING, PORTS & HOSTING INFRASTRUCTURE
- [VERIFIED-READ] **Frontend Dev Server Port**: `5173` (`http://localhost:5173`) (Vite v6.4.4)
- [VERIFIED-READ] **Python Telemetry Bridge Port**: `8000` (`http://localhost:8000`) (`server/app.py:L16`)
- [VERIFIED-READ] **Local LLM Inference Port**: `11434` (`http://localhost:11434`) (Ollama HTTP REST API)
- [VERIFIED-RUN] **External Cloud / Deployed URLs**: None (`0` external servers; 100% localhost air-gapped sovereign architecture)
- [VERIFIED-RUN] **Active CORS Origins**: `*` on port 8000 (`server/app.py:L55`); `http://localhost:5173` on Ollama port 11434.

---

## 4. SOFTWARE RUNTIMES & RESOLVED DEPENDENCY VERSIONS
*(Strictly from `package-lock.json` lockfile resolutions; no version ranges)*
- [VERIFIED-READ] **Node.js Runtime**: `v22.11.0` (active system node)
- [VERIFIED-READ] **Python Runtime**: `3.14.7` (macOS standard library; `0` pip packages required)
- [VERIFIED-READ] **React**: `19.3.0` (from `node_modules/react` in `package-lock.json`)
- [VERIFIED-READ] **ReactDOM**: `19.3.0` (from `node_modules/react-dom` in `package-lock.json`)
- [VERIFIED-READ] **Three.js**: `0.174.0` (from `node_modules/three` in `package-lock.json`)
- [VERIFIED-READ] **Lucide React**: `1.54.0` (from `node_modules/lucide-react` in `package-lock.json`)
- [VERIFIED-READ] **Vite**: `6.4.4` (from `node_modules/vite` in `package-lock.json`)
- [VERIFIED-READ] **TailwindCSS**: `4.3.3` (from `node_modules/tailwindcss` in `package-lock.json`)
- [VERIFIED-READ] **@tailwindcss/vite**: `4.3.3` (from `node_modules/@tailwindcss/vite` in `package-lock.json`)
- [VERIFIED-READ] **@vitejs/plugin-react**: `4.3.4` (from `node_modules/@vitejs/plugin-react` in `package-lock.json`)

---

## 5. LOCAL AI / LLM INFERENCE SPECIFICATIONS
- [VERIFIED-READ] **Active AI Model**: `mistral:latest` (from `src/components/AARDebriefModal.jsx:L92`, `server/app.py:L132`)
- [VERIFIED-RUN] **Model Digest**: `6577803aa9a036369e481d648a2baebb381ebc6e897f2bb9a766a2aa7bfbc1cf`
- [VERIFIED-RUN] **Parameter Size**: `7.2B` (`Q4_K_M` GGUF quantization)
- [VERIFIED-RUN] **Context Window**: `32768` tokens
- [VERIFIED-RUN] **Model Disk Footprint**: `4,372,824,384` bytes (~4.07 GiB)
- [VERIFIED-READ] **Inference Timeout**: `15000` ms (15.0 seconds in `AARDebriefModal.jsx:L87`, `server/app.py:L132`)
- [VERIFIED-READ] **Fallback AI Mechanism**: Deterministic high-fidelity tactical rule engine based on DSSC doctrine (`AARDebriefModal.jsx:L110-L115`, `server/app.py:L142-L154`)

---

## 6. SIMULATION & KINEMATICS ENGINE CONSTANTS
- [VERIFIED-READ] **Physics Tick Loop**: 60 Hz `requestAnimationFrame` with clamp `dt = Math.min(0.1, delta)` (`src/App.jsx:L52`)
- [VERIFIED-READ] **Coordinate System**: Three.js standard coordinates `(X, Y, Z)` in real-world metric meters
- [VERIFIED-READ] **Protected Base Origin**: `(0, 0, 0)` (`BASE_ORIGIN` in `src/simulation/SwarmEngine.js:L4`)
- [VERIFIED-READ] **Inner Perimeter Breach Threshold**: `< 250.0` meters from `BASE_ORIGIN` (`src/simulation/DroneAgent.js:L142`)
- [VERIFIED-READ] **Point-Defense Stand-Off Zone**: `1,500.0` meters (`RadarViewport.jsx:L73`)
- [VERIFIED-READ] **Surveillance Radar Envelope**: `5,000.0` meters radius (`RadarViewport.jsx:L75`, `DroneAgent.js:L235`)
- [VERIFIED-READ] **Radar Sweep Velocity**: 30 RPM (360° PPI sweep line in `RadarViewport.jsx:L320`)

---

## 7. UAS THREAT CLASSIFICATIONS & CHARACTERISTICS
*(Defined in `src/simulation/DroneAgent.js:L3-L43`)*

| Threat Class Key | Code | Name | Max Speed (m/s) | Max Speed (km/h) | Default Alt (m) | Radar RCS (dBsm) | RF Frequency Band | Acoustic Whine | Payload Threat | Mesh Color |
|---|---|---|---|---|---|---|---|---|---|---|
| `QUADCOPTER` | `UAV-QUAD` | Commercial Quadcopter | 16.0 m/s | 57.6 km/h | 120.0 m | -20.0 dBsm | 2.4 GHz FHSS | 5,200 Hz | ISR Surveillance | `0xffaa00` (Amber) |
| `FPV_KAMIKAZE` | `UAV-FPV` | FPV Kamikaze Drone | 42.0 m/s | 151.2 km/h | 80.0 m | -23.0 dBsm | 5.8 GHz Analog | 7,800 Hz | HE-FRAG Warhead | `0xff2a3b` (Red) |
| `LOITERING_MUNITION` | `UAV-WING` | Fixed-Wing Loitering Munition | 32.0 m/s | 115.2 km/h | 280.0 m | -10.0 dBsm | 900 MHz Telemetry | 3,400 Hz | Shaped Charge AP | `0xff4488` (Magenta) |

---

## 8. C-UAS EFFECTORS & WEAPON SUBSYSTEMS
*(Defined in `src/simulation/SwarmEngine.js`, `src/simulation/DroneAgent.js`, `src/components/WeaponConsole.jsx`)*
- [VERIFIED-READ] **Weapon 1 (Soft-Kill)**: Directional RF Jammer
  - Effective Envelope: `5,000.0` meters (`DroneAgent.js:L235`)
  - Conical Beam Width: `20.0` degrees (`DroneAgent.js:L248`)
  - Lock Dwell Duration Required: `2.5` seconds continuous tracking (`DroneAgent.js:L249`)
  - Resulting Drone State: `JAMMED_RTH` (drifts away from base and climbs out at 1.5x speed; `DroneAgent.js:L94-L98`)
- [VERIFIED-READ] **Weapon 2 (Hard-Kill)**: Kinetic Net Interceptor Pod
  - Total Ammunition: `8` rounds per drill session (`SwarmEngine.js:L60`)
  - Interceptor Rocket Velocity: `600.0` m/s (`SwarmEngine.js:L237`)
  - Target Tracking: Real-time dynamic vector tracking (`SwarmEngine.js:L158`)
  - Resulting Drone State: `NEUTRALIZED` (enters 35 m/s free-fall to ground; `DroneAgent.js:L80`)
- [VERIFIED-READ] **Weapon 3 (Electronic Warfare)**: GNSS Area Spoofer
  - Mode: Area-wide coordinate dispersion (`DroneAgent.js:L100-L106`)
  - Induces random vector wander `[-25, +25]` m/s in X/Z and `[-10, +10]` in Y.

---

## 9. COMBAT READINESS SCORING & DSSC GRADING FORMULA
*(Defined in `src/components/AARDebriefModal.jsx:L28-L56`)*
- [VERIFIED-READ] **Base Combat Readiness Score**: `100` points
- [VERIFIED-READ] **Perimeter Breach Penalty**: `-25` points per breached drone (`AARDebriefModal.jsx:L30`)
- [VERIFIED-READ] **Unaddressed Threat Penalty**: `-15` points per active/unneutralized drone (`AARDebriefModal.jsx:L33`)
- [VERIFIED-READ] **Classification Accuracy Weight**: `15%` penalty factor `(100 - acc) * 0.15` (`AARDebriefModal.jsx:L35`)
- [VERIFIED-READ] **Wasted Kinetic Ammo Penalty**: `-5` points per round fired exceeding confirmed hard-kills (`AARDebriefModal.jsx:L38`)
- [VERIFIED-READ] **Time-to-Detect (TTD) Penalty**: `-5` points if TTD > 10s; `-10` points if TTD > 20s (`AARDebriefModal.jsx:L40-L41`)
- [VERIFIED-READ] **Extended Duration Penalty**: `-5` points if total engagement > 120s (`AARDebriefModal.jsx:L43`)
- [VERIFIED-READ] **Score Bounds**: Clamped between `0` and `100` (`AARDebriefModal.jsx:L44`)
- [VERIFIED-READ] **Letter Grade Thresholds**:
  - `A+`: Score >= 90 (Green `#00ff66`)
  - `A`: Score >= 80 (Green `#00ff66`)
  - `B`: Score >= 70 (Gold `#d4af37`)
  - `C`: Score >= 55 (Amber `#ffaa00`)
  - `FAIL`: Score < 55 (Red `#ff2a3b`)

---

## 10. SCENARIOS DEFINED IN SYSTEM
*(Defined in `src/simulation/SwarmEngine.js:L6-L47`)*
- [VERIFIED-READ] **Scenario 1**: `EXERCISE DESERT SHIELD` (Pokhran Field Firing Range, Rajasthan)
  - Threat Level: `DEFCON 3`
  - Units: 5 total (2 Loitering Munitions at 4,200m, 3 Quadcopters at 3,000m)
  - Weather: `CLEAR`, Night Mode: `false`
- [VERIFIED-READ] **Scenario 2**: `EXERCISE MOUNTAIN SENTINEL` (Eastern Ladakh FOB, Sub-Zero Sector)
  - Threat Level: `DEFCON 2`
  - Units: 6 total (4 FPV Kamikazes at 2,800m, 2 Quadcopters at 2,400m)
  - Weather: `FOG`, Night Mode: `true` (FLIR White-Hot / Black-Hot primary)
- [VERIFIED-READ] **Scenario 3**: `EXERCISE COASTAL SWARM (DSSC BENCHMARK)` (INS Hansa Coastal Base, Goa)
  - Threat Level: `DEFCON 1 (MAXIMUM ALERT)`
  - Units: 10 total (6 Quadcopters at 4,000m, 3 FPV Kamikazes at 3,500m, 1 Loitering Munition at 4,800m)
  - Swarm Physics: Reynolds Boids flocking with splitting maneuvers; Weather: `CLEAR`, Night Mode: `false`
