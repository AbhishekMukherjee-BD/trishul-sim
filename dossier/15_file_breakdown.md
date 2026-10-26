# ═══════════════════════════════════════════════════════════════════════════════
# TRISHUL-SIM: COMPLETE TIERED FILE BREAKDOWN (15_file_breakdown.md)
# ═══════════════════════════════════════════════════════════════════════════════

## 1. REPOSITORY DIRECTORY TREE

```
/Users/abhishekmukherjee/Developer/hanku 
├── index.html                           # Single-page HTML entry point (15 lines)
├── package.json                         # Project metadata & npm scripts (25 lines)
├── package-lock.json                    # Exact dependency lockfile (~1990 lines)
├── vite.config.js                       # Vite 6 + React + Tailwind v4 config (16 lines)
├── test-audit.js                        # 38-assertion regression test suite (167 lines)
├── README.md                            # High-level architecture documentation (75 lines)
├── server/
│   └── app.py                           # Python MAVLink & DSSC AAR bridge server (175 lines)
├── src/
│   ├── main.jsx                         # React root mount (10 lines)
│   ├── App.jsx                          # Root tactical command console (459 lines)
│   ├── index.css                        # Design tokens, CRT scanlines & fonts (252 lines)
│   ├── simulation/
│   │   ├── DroneAgent.js                # Agent kinematics, Boids flocking (266 lines)
│   │   └── SwarmEngine.js               # Multi-drone swarm simulation lifecycle (286 lines)
│   ├── shaders/
│   │   └── thermalShader.js             # GLSL fragment/vertex thermal shaders (89 lines)
│   └── components/
│       ├── RadarViewport.jsx            # 3D Three.js tactical radar scope (561 lines)
│       ├── FLIRViewport.jsx             # EO/IR thermal infrared camera feed (277 lines)
│       ├── SensorSuite.jsx              # RF spectrum, acoustics & radar sensors (158 lines)
│       ├── TargetTrackCard.jsx          # Target telemetry card & speed in km/h (164 lines)
│       ├── WeaponConsole.jsx            # Effectors: Jammer, Kinetic Net, Spoofer (156 lines)
│       ├── AARDebriefModal.jsx          # After-Action Review modal with Ollama (247 lines)
│       └── MissionBriefingModal.jsx     # Pre-drill tactical scenario briefing (100 lines)
├── t/
│   └── SIH2026-IDEA-Presentation-Format.pptx # Official SIH 6-Slide presentation template
└── dossier/                             # Verified architecture & technical dossier
```

---

## 2. TIER 1: CORE ARCHITECTURAL FILES (Block-by-Block Analysis)

### 1. `src/simulation/SwarmEngine.js` (286 lines)
- **Role**: Master simulation controller and kinematics coordinator.
- **Inputs**: Scenario presets (`SCENARIO_PRESETS`), operator effector commands (jamming angle, kinetic launch, spoofer toggle), delta-time (`dt`).
- **Outputs**: Comprehensive state snapshot broadcast to UI via `onStateChange` callback (drones array, active interceptors, selected drone, environment, metrics).
- **Core Blocks**:
  - `SCENARIO_PRESETS` (`L6-L47`): Scenario 1 (Desert Shield - 5 units), Scenario 2 (Mountain Sentinel - 6 units), Scenario 3 (Coastal Swarm - 10 units).
  - `constructor()` (`L49-L85`): Initializes effector states, environment flags, and metric counters.
  - `loadScenario(scenarioId)` (`L87-L93`): Switches active scenario and resets simulation.
  - `resetSimulation()` (`L95-L147`): Spawns drone agents in radial sectors around the base with randomized distance/altitude jitter.
  - `update(dt)` (`L149-L195`): Advances in-flight kinetic interceptors at 600 m/s with vector tracking; executes RF jamming conical dwell checks; steps drone agent Boids kinematics; detects base perimeter breaches (<250m).
  - `fireKineticNet(targetId)` (`L225-L250`): Consumes 1 of 8 ammo rounds, computes ballistics, and instantiates an interceptor projectile.

### 2. `src/simulation/DroneAgent.js` (266 lines)
- **Role**: Individual autonomous UAS threat model and local kinematic state machine.
- **Inputs**: Delta-time (`dt`), neighboring drone array, base origin vector, jammer azimuth.
- **Outputs**: Real-time position (`THREE.Vector3`), velocity, acceleration, state transitions (`INGRESS`, `JAMMED_RTH`, `NEUTRALIZED`, `BREACHED`).
- **Core Blocks**:
  - `THREAT_TYPES` (`L3-L43`): Physical attributes for `QUADCOPTER` (16 m/s, -20 dBsm, 2.4 GHz), `FPV_KAMIKAZE` (42 m/s, -23 dBsm, 5.8 GHz), and `LOITERING_MUNITION` (32 m/s, -10 dBsm, 900 MHz).
  - `update(dt, allDrones, spooferActive)` (`L77-L155`): Computes Reynolds forces (seek, separate, align, cohere), integrates Euler equations, clamps velocity to $v_{\text{max}}$, clamps minimum altitude to 30m, and evaluates base breach threshold (<250m).
  - `applyJamming(dt, jammerAngleDeg, maxJamRange)` (`L235-L257`): Calculates angular delta against 20° conical beam within 5,000m. Accumulates dwell timer to 2.5s to trigger `JAMMED_RTH`.
  - `applyKineticHit()` (`L259-L265`): Validates projectile impact and transitions any non-neutralized drone to `NEUTRALIZED`.

### 3. `src/components/RadarViewport.jsx` (561 lines)
- **Role**: High-refresh 3D WebGL tactical AESA radar PPI scope.
- **Inputs**: Active drones array, selected drone ID, base origin, effector states (active jammer azimuth, interceptors).
- **Outputs**: Rendered 3D WebGL canvas with interactive mouse orbit/zoom and drone click selection.
- **Core Blocks**:
  - `setupScene()` (`L40-L180`): Initializes Three.js Scene, Orthographic/Perspective Camera, WebGLRenderer with antialiasing, concentric range rings (250m, 1500m, 3500m, 5000m), and cardinal text sprites (`N`, `S`, `E`, `W`).
  - **Object Pooling System** (`L45-L75`): Pre-allocates 16 drone blip meshes and 16 trajectory line buffers. Avoids continuous geometry reallocation.
  - `renderLoop()` (`L280-L360`): Updates blip coordinates, rotates 30 RPM radar sweep line, draws dynamic cyan RF jammer beam cone, and animates rocket interceptor projectiles.

### 4. `src/components/FLIRViewport.jsx` (277 lines)
- **Role**: Electro-Optical / Infrared (EO/IR) thermal camera targeting viewport.
- **Inputs**: Selected drone agent telemetry, thermal mode (`WHOT`, `BHOT`, `IRONBOW`), digital zoom factor.
- **Outputs**: Canvas rendering with thermal color gradients, targeting crosshairs, lock-on box, and optical telemetry.
- **Core Blocks**:
  - Target Tracking Engine: Computes optical elevation and azimuth tracking relative to selected drone position.
  - Thermal Shader Integration: Feeds normalized infrared emission levels based on drone engine heat signatures.
  - HUD Reticle Renderer (`L140-L240`): Draws mil-dot targeting reticle, lead-angle calculation cues, and coordinate telemetry.

### 5. `src/shaders/thermalShader.js` (89 lines)
- **Role**: Custom WebGL GLSL ShaderMaterial for thermal infrared physics simulation.
- **Inputs**: Texture coordinates, thermal palette uniform (`mode`), noise factor, heat intensity uniform.
- **Outputs**: Fragment color output mapped to calibrated military thermal infrared curves.
- **Core Blocks**:
  - `thermalVertexShader`: Standard UV and position projection.
  - `thermalFragmentShader`: Computes per-pixel heat luminance; maps temperature values to White-Hot (grayscale high), Black-Hot (inverted), or Ironbow (black-purple-orange-yellow) color ramps.

### 6. `src/components/WeaponConsole.jsx` (156 lines)
- **Role**: Operator countermeasure command and effector engagement panel.
- **Inputs**: Selected drone, jammer active status, jammer azimuth, spoofer status, kinetic ammo count.
- **Outputs**: Dispatches `onToggleJammer`, `onSetJammerAngle`, `onFireKinetic`, and `onToggleSpoofer` events.
- **Core Blocks**:
  - Weapon 1 Column (`L27-L88`): 360° azimuth dial, `SNAP TO TARGET` auto-aim button, dwell lock progress bar (0–100%).
  - Weapon 2 Column (`L90-L124`): Kinetic Net Pod with 8-round visual magazine indicators, `FIRE INTERCEPTOR` action button.
  - Weapon 3 Column (`L126-L154`): GNSS Area Spoofer toggle with active status indicator.

### 7. `src/components/AARDebriefModal.jsx` (247 lines)
- **Role**: Tactical After-Action Review presentation modal and AI debrief orchestrator.
- **Inputs**: `engineState` (metrics, drones array, scenario).
- **Outputs**: Renders letter grade, combat score, detailed metric cards, and local Ollama Mistral debrief text.
- **Core Blocks**:
  - Scoring Formula (`L28-L56`): Evaluates breaches, unaddressed targets, classification accuracy, ammo waste, TTD, and duration.
  - Ollama Async Fetch (`L60-L107`): Sends tactical evaluation prompt to `http://localhost:11434/api/generate` with 15s timeout.
  - Deterministic Rule Engine (`L110-L115`): Immediate fallback generating structured 4-part military debrief if Ollama is unreachable.

### 8. `server/app.py` (175 lines)
- **Role**: Zero-dependency Python 3 standard library backend and MAVLink telemetry bridge.
- **Inputs**: Client HTTP requests on port 8000.
- **Outputs**: JSON responses for `/api/health`, `/api/mavlink/sample_packets`, and `/api/aar/evaluate`.
- **Core Blocks**:
  - `SAMPLE_MAVLINK_PACKETS` (`L18-L50`): Valid MAVLink v2.0 message 33 (`GLOBAL_POSITION_INT`) and message 30 (`ATTITUDE`).
  - `TrishulHandler` (`L52-L163`): Custom HTTP handler with CORS headers, GET routing, and POST evaluation router querying local Ollama.
  - `run_server()` (`L164-L175`): Binds `socketserver.TCPServer` with `allow_reuse_address = True` on port 8000.

### 9. `src/App.jsx` (459 lines)
- **Role**: Top-level application orchestrator, state hub, keyboard shortcut listener, and audio synthesizer.
- **Inputs**: Browser user events, 60 Hz animation frame ticks.
- **Outputs**: Manages view mode (`SPLIT`, `RADAR`, `EOIR`), modal states (`briefingOpen`, `aarOpen`), and audio tone generation.
- **Core Blocks**:
  - Engine Initialization (`L38-L61`): Instantiates `SwarmEngine` and binds 60 Hz physics loop via `requestAnimationFrame`.
  - Keyboard Shortcuts (`L69-L96`): Binds `J` (Jammer), `K`/`Space` (Kinetic Fire), `G` (GNSS Spoofer), `1/2/3` (Scenarios), `Tab` (Cycle Targets).
  - Web Audio Synthesizer (`L99-L122`): Generates procedural audio waves (`sawtooth` for RF jamming, `triangle` for rocket fire).

### 10. `test-audit.js` (167 lines)
- **Role**: Automated regression test suite containing 38 assertions across all simulation, effector, backend, and AI subsystems.
- **Inputs**: Direct imports of `SwarmEngine.js` and `DroneAgent.js`, network fetch calls to ports 8000 and 11434.
- **Outputs**: Formatted console output detailing test passes/failures, process exit code 0 or 1.

---

## 3. TIER 2: SECONDARY APPLICATION MODULES

- **`src/components/SensorSuite.jsx`** (158 lines): Displays real-time RF waterfall spectrum bars (2.4 GHz, 5.8 GHz, 900 MHz) with simulated inverse-distance attenuation, acoustic whine frequencies, and AESA 3D Radar scan modes.
- **`src/components/TargetTrackCard.jsx`** (164 lines): Target queue sidebar listing all active UAS contacts; computes speed in km/h (`* 3.6`), distance, bearing, and altitude; provides classification selection buttons.
- **`src/components/MissionBriefingModal.jsx`** (100 lines): Initial tactical doctrine selector modal displaying 3 scenario cards with DEFCON levels, threat composition, and commencement button.
- **`src/main.jsx`** (10 lines): Standard React 19 root bootstrap mounting `App.jsx` to `#root` inside `React.StrictMode`.
- **`src/index.css`** (252 lines): Military design tokens, Tailwind v4 imports, custom HUD scanline overlays, CRT vignette shaders, and offline system font fallbacks.

---

## 4. TIER 3: CONFIGURATION, ASSETS & BUILD SCRIPTS

- **`index.html`** (15 lines): HTML entry point; includes offline shield emoji SVG favicon (`data:image/svg+xml`) and zero-CDN metadata.
- **`package.json`** (25 lines): NPM package configuration defining `type: "module"` and scripts for `dev`, `build`, `preview`, and `test`.
- **`package-lock.json`** (~1990 lines): Exact resolved versions of all dependencies and transitive packages.
- **`vite.config.js`** (16 lines): Configures Vite 6 with `@vitejs/plugin-react` and `@tailwindcss/vite`.
- **`README.md`** (75 lines): Technical overview of Project TRISHUL-SIM, quickstart commands, and architectural summary.
- **`t/SIH2026-IDEA-Presentation-Format.pptx`**: Official SIH 2026 Idea Submission presentation template.
