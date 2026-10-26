# ═══════════════════════════════════════════════════════════════════════════════
# TRISHUL-SIM: SYSTEM ARCHITECTURE & INTEGRATION FLOWS (05_architecture.md)
# ═══════════════════════════════════════════════════════════════════════════════

## 1. SUBSYSTEM ARCHITECTURAL BREAKDOWN

Project TRISHUL-SIM implements a **two-tier sovereign air-gapped architecture** designed for high-refresh visual simulation and zero-cloud telemetry evaluation:

1. **Client Command & Simulation Tier (Browser Runtime)**:
   - **Physics & Swarm Core** (`src/simulation/SwarmEngine.js`, `DroneAgent.js`): Executes a deterministic 60 Hz Euler kinematics loop calculating multi-agent Reynolds flocking forces, base ingress vectors, jamming dwell timers, and projectile ballistics.
   - **3D AESA Radar Engine** (`src/components/RadarViewport.jsx`): Manages a WebGL Three.js scene utilizing pre-allocated mesh pools (16 drone markers, 16 3D trail buffers) to prevent browser garbage collection spikes.
   - **Thermal Infrared Optical Pipeline** (`src/components/FLIRViewport.jsx`, `src/shaders/thermalShader.js`): A custom GLSL ShaderMaterial simulating electro-optical infrared sensor characteristics (White-Hot / Black-Hot / Ironbow).
   - **Tactical Audio Synthesizer** (`src/App.jsx`): Direct Web Audio API procedural sound generation without external audio media assets.

2. **Backend Telemetry & Sovereignty Tier (Python Server & Ollama)**:
   - **Python Telemetry Bridge** (`server/app.py`): Zero-dependency standard library HTTP/TCP server running on port `8000`. Streams MAVLink v2.0 military packet structures (`GLOBAL_POSITION_INT`, `ATTITUDE`) for integration with military ground control software (QGroundControl, PX4).
   - **Local LLM Directing Staff** (`http://localhost:11434`): On-device Ollama REST server running `mistral:latest` (7.2B parameters) evaluating combat telemetry under strict 15-second abort controller timeouts with local deterministic rule fallback.

---

## 2. MERMAID DIAGRAM (A): HIGH-LEVEL ARCHITECTURE

```mermaid
graph TB
    subgraph Client_Browser ["Client Tier: Tactical Command Console (Port 5173)"]
        UI["Tactical HUD (React 19)"]
        
        subgraph Viewports ["Dual Visual Sensor Engines"]
            Radar["3D AESA Radar PPI Scope (Three.js 0.174)"]
            FLIR["EO/IR Thermal Camera (GLSL ShaderMaterial)"]
        end
        
        subgraph SimCore ["Autonomous Simulation Core"]
            Engine["SwarmEngine (60Hz Physics Loop)"]
            Agents["DroneAgent (Reynolds Swarm & State Machine)"]
            Effectors["Effector Controllers (RF Jammer, Kinetic Net, GNSS Spoofer)"]
        end

        UI --> Radar
        UI --> FLIR
        UI --> Effectors
        Effectors --> Engine
        Engine --> Agents
        Agents --> Radar
        Agents --> FLIR
    end

    subgraph Host_System ["Host System Tier: Telemetry & AI Services"]
        PyBridge["Python Telemetry Bridge (Port 8000 - app.py)"]
        Ollama["Local Sovereign LLM (Port 11434 - Mistral 7.2B)"]
    end

    UI -->|HTTP POST /api/aar/evaluate| PyBridge
    UI -.->|Direct Fallback /api/generate| Ollama
    PyBridge -->|REST Request /api/generate| Ollama
    PyBridge -->|MAVLink v2.0 Packets /api/mavlink/sample_packets| ExtGCS["External Ground Station (PX4 / QGroundControl)"]
```

---

## 3. MERMAID DIAGRAM (B): MISSION ENGAGEMENT & EVALUATION SEQUENCE

```mermaid
sequenceDiagram
    autonumber
    actor Officer as Trainee Officer
    participant HUD as Command Console (React)
    participant Sim as SwarmEngine (60Hz)
    participant Drone as Hostile DroneAgent
    participant Bridge as Python Server (:8000)
    participant AI as Ollama Mistral (:11434)

    Officer->>HUD: Select 'EXERCISE DESERT SHIELD' & Start
    HUD->>Sim: loadScenario('SCENARIO_1')
    Sim->>Drone: Spawn 5 UAS Agents (Ingress State)
    
    loop 60Hz Physics Clock
        Sim->>Drone: update(dt, Reynolds Flocking, Ingress)
        Drone-->>HUD: Stream Telemetry (Speed km/h, Range, Bearing)
    end

    Officer->>HUD: Snap Azimuth & Engage Directional RF Jammer
    HUD->>Sim: toggleRfJammer(true, Azimuth)
    Sim->>Drone: applyJamming(dt, 20° Beam, 5000m Envelope)
    Note over Drone: Dwell Timer >= 2.5s
    Drone->>Drone: State Transition: JAMMED_RTH (Climb & Flee)

    Officer->>HUD: Fire Kinetic Net Interceptor at Ingressing FPV
    HUD->>Sim: fireKineticNet(targetId)
    Sim->>Sim: Launch 600 m/s Interceptor with Vector Tracking
    Sim->>Drone: applyKineticHit() -> State: NEUTRALIZED
    Drone->>Drone: 35 m/s Free Fall to Ground

    Note over Sim: All Threats Neutralized or Breached
    Sim-->>HUD: Trigger After-Action Review (AAR)
    HUD->>Bridge: POST /api/aar/evaluate (Metrics Payload)
    Bridge->>AI: POST /api/generate (Mistral prompt, stream: false)
    AI-->>Bridge: Generated Tactical Debrief Text
    Bridge-->>HUD: JSON { debrief: "..." }
    HUD-->>Officer: Render Letter Grade & DSSC Directives
```

---

## 4. COMMUNICATION PROTOCOLS & IPC
- [VERIFIED-READ] **Client Internal State Synchronization**: Unidirectional event notification pattern (`SwarmEngine.notify()`) broadcasting state snapshots to React components.
- [VERIFIED-READ] **Telemetry Serialization Protocol**: MAVLink v2.0 binary packet emulation encoded as JSON structures over standard HTTP REST.
- [VERIFIED-READ] **AI Inference RPC**: Standard HTTP JSON REST POST with `AbortController` cancellation signals (`15,000` ms timeout).
- [VERIFIED-READ] **Cross-Origin Resource Sharing (CORS)**: Pre-flight `OPTIONS` support enabled on both Python bridge (`server/app.py:L55`) and Ollama (`localhost:11434`).
