# ═══════════════════════════════════════════════════════════════════════════════
# TRISHUL-SIM: DATA LAYER & PROTOCOL SCHEMAS (08_data_layer.md)
# ═══════════════════════════════════════════════════════════════════════════════

## 1. STORAGE PHILOSOPHY & IN-MEMORY ARCHITECTURE
- [VERIFIED-READ] **Zero-Database Design**: Project TRISHUL-SIM purposefully incorporates **zero persistent database engines** (no PostgreSQL, SQLite, MongoDB, or Firebase).
- [INFERRED] In defence staff college training environments, leaving unencrypted exercise logs on trainee workstations presents an operational security risk. All session state, trajectory points, and telemetry are maintained in volatile RAM and cleared upon session reset or browser close.

---

## 2. MAVLINK v2.0 PACKET DATA STRUCTURES

The Python bridge (`server/app.py:L18-L50`) structures telemetry following the official military MAVLink v2.0 protocol standard:

### Packet 1: `GLOBAL_POSITION_INT` (Message ID: 33)
Emulates GPS and barometric altitude telemetry from an ingressing hostile or blue-force UAS:

| Field Name | Type | Value / Expression in Code | Description / Units |
|---|---|---|---|
| `time_boot_ms` | `uint32` | `int(time.time() * 1000) % 1000000` | Timestamp since autopilot boot (milliseconds) |
| `lat` | `int32` | `341525000` | Ladakh FOB Latitude (degrees * 1e7 = 34.1525000° N) |
| `lon` | `int32` | `775775000` | Ladakh FOB Longitude (degrees * 1e7 = 77.5775000° E) |
| `alt` | `int32` | `3520000` | Altitude above Mean Sea Level (mm = 3,520.0 m MSL) |
| `relative_alt` | `int32` | `180000` | Altitude Above Ground Level (mm = 180.0 m AGL) |
| `vx` | `int16` | `-1520` | Ground X velocity (cm/s = -15.2 m/s Westward) |
| `vy` | `int16` | `2840` | Ground Y velocity (cm/s = +28.4 m/s Northward) |
| `vz` | `int16` | `-120` | Vertical descent rate (cm/s = -1.2 m/s) |
| `hdg` | `uint16` | `14200` | Vehicle compass heading (cdeg = 142.0° SE) |

### Packet 2: `ATTITUDE` (Message ID: 30)
Emulates vehicle inertial measurement unit (IMU) pitch, roll, and yaw angles:

| Field Name | Type | Value in Code | Units |
|---|---|---|---|
| `roll` | `float` | `0.08` | Roll angle (-pi..+pi radians) |
| `pitch` | `float` | `-0.15` | Pitch angle (-pi..+pi radians) |
| `yaw` | `float` | `2.47` | Yaw angle (-pi..+pi radians) |
| `rollspeed` | `float` | `0.01` | Angular roll velocity (rad/s) |
| `pitchspeed`| `float` | `0.02` | Angular pitch velocity (rad/s) |
| `yawspeed` | `float` | `0.05` | Angular yaw velocity (rad/s) |

---

## 3. CLIENT RUNTIME STATE SCHEMAS

### A. Drone Agent Schema (`src/simulation/DroneAgent.js`)
```typescript
interface DroneAgentState {
  id: string;                     // e.g. "UAV-QUAD-01"
  type: ThreatTypeDefinition;     // QUADCOPTER | FPV_KAMIKAZE | LOITERING_MUNITION
  position: THREE.Vector3;        // Metric (x, y, z) relative to base (0, 0, 0)
  velocity: THREE.Vector3;        // Current velocity vector (m/s)
  acceleration: THREE.Vector3;    // Summed Reynolds + Ingress forces (m/s^2)
  state: 'INGRESS' | 'EVADING' | 'JAMMED_RTH' | 'NEUTRALIZED' | 'BREACHED';
  health: number;                 // 0 to 100
  jamDwellTimer: number;          // Continuous seconds inside 20° jammer beam
  altitude: number;               // Current Y coordinate (meters)
  heading: number;                // Compass heading in degrees (0 to 360)
  classifiedAs: string | null;    // Trainee assigned threat classification
  priority: string;               // 'UNASSIGNED' | 'ALPHA' | 'BRAVO' | 'CHARLIE'
  trail: THREE.Vector3[];         // Circular buffer of last 20 trajectory positions
}
```

### B. Session Metrics Schema (`src/simulation/SwarmEngine.js:L71-L82`)
```typescript
interface SessionMetrics {
  startTime: number;              // High-resolution timestamp (performance.now())
  elapsedTime: number;            // Total seconds elapsed in drill
  totalSpawned: number;           // Total hostile contacts in active scenario
  neutralizedSoftKill: number;    // Count disabled via Directional RF Jammer
  neutralizedHardKill: number;    // Count destroyed via Kinetic Net Interceptor
  breaches: number;               // Count penetrating the 250m base perimeter
  kineticRoundsFired: number;     // Total net rockets launched (max 8)
  classificationAttempts: number; // Total classification inputs submitted
  classificationCorrect: number;  // Correct matches against ground truth type
  firstDetectionTime: number | null; // Seconds elapsed before first target selected
}
```

---

## 4. END-TO-END DATA FLOW PIPELINE

```
[Scenario Preset JSON]
         │
         ▼
[SwarmEngine Instantiation] ──(Instantiates)──► [DroneAgent Array (RAM)]
         │                                              │
         ▼ (60Hz Physics Clock)                         ▼
[Kinematic State Integration] ────────────────► [Object-Pooled 3D Meshes]
         │                                              │
         ▼                                              ▼
[Effector Evaluation (Jam/Net)] ──────────────► [GLSL Shaders & Three.js Canvas]
         │
         ▼ (Mission Completion)
[Session Metrics Aggregation] ──(HTTP POST)───► [Python Bridge / Ollama LLM]
                                                        │
                                                        ▼
                                                [AAR Tactical Debrief]
```
