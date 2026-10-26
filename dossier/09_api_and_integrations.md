# ═══════════════════════════════════════════════════════════════════════════════
# TRISHUL-SIM: API ENDPOINTS & INTEGRATIONS (09_api_and_integrations.md)
# ═══════════════════════════════════════════════════════════════════════════════

## 1. BACKEND REST API ENDPOINTS (`server/app.py`)

All backend endpoints are hosted on `http://localhost:8000` via standard library Python socketserver:

### Endpoint 1: System Health & Protocol Verification
- [VERIFIED-READ] **Method & Path**: `GET /api/health`
- [VERIFIED-READ] **Authentication**: None (Localhost air-gapped)
- [VERIFIED-READ] **Purpose**: Health-check monitor verifying MAVLink C-UAS bridge status and server availability.
- [VERIFIED-RUN] **Sample Response** (HTTP 200 OK):
```json
{
  "status": "OPERATIONAL",
  "system": "TRISHUL-SIM C-UAS TELEMETRY BRIDGE",
  "protocol": "MAVLink v2.0",
  "timestamp": 1792391468.464884
}
```
- [VERIFIED-RUN] **Status**: **Working** (Verified via curl, HTTP 200).

---

### Endpoint 2: MAVLink v2.0 Sample Telemetry Stream
- [VERIFIED-READ] **Method & Path**: `GET /api/mavlink/sample_packets`
- [VERIFIED-READ] **Authentication**: None
- [VERIFIED-READ] **Purpose**: Provides ground control station (GCS) software with real-time PX4/ArduPilot-compatible telemetry packets for Ladakh FOB flight paths.
- [VERIFIED-RUN] **Sample Response** (HTTP 200 OK):
```json
{
  "protocol": "MAVLink v2.0",
  "packets": [
    {
      "message_id": 33,
      "name": "GLOBAL_POSITION_INT",
      "system_id": 1,
      "component_id": 1,
      "fields": {
        "time_boot_ms": 445863,
        "lat": 341525000,
        "lon": 775775000,
        "alt": 3520000,
        "relative_alt": 180000,
        "vx": -1520,
        "vy": 2840,
        "vz": -120,
        "hdg": 14200
      }
    },
    {
      "message_id": 30,
      "name": "ATTITUDE",
      "system_id": 1,
      "component_id": 1,
      "fields": {
        "roll": 0.08,
        "pitch": -0.15,
        "yaw": 2.47,
        "rollspeed": 0.01,
        "pitchspeed": 0.02,
        "yawspeed": 0.05
      }
    }
  ],
  "compatibility": ["PX4 Autopilot", "ArduPilot", "QGroundControl"]
}
```
- [VERIFIED-RUN] **Status**: **Working** (Verified via curl, HTTP 200).

---

### Endpoint 3: Tactical After-Action Review (AAR) Evaluator
- [VERIFIED-READ] **Method & Path**: `POST /api/aar/evaluate`
- [VERIFIED-READ] **Authentication**: None
- [VERIFIED-READ] **Headers**: `Content-Type: application/json`
- [VERIFIED-READ] **Purpose**: Accepts post-mission drill telemetry from the client, structures the DSSC tactical evaluation prompt, queries local Ollama Mistral, and returns the formatted military debrief.
- [VERIFIED-RUN] **Sample Request Payload**:
```json
{
  "scenario_name": "EXERCISE DESERT SHIELD",
  "total_threats": 5,
  "soft_kills": 3,
  "hard_kills": 2,
  "breaches": 0,
  "kinetic_rounds": 2,
  "classification_accuracy": 100,
  "elapsed_time_sec": 48
}
```
- [VERIFIED-RUN] **Sample Response** (HTTP 200 OK):
```json
{
  "debrief": "**1. OPERATIONAL OVERVIEW**\nUnit successfully intercepted 5/5 hostile UAS tracks during EXERCISE DESERT SHIELD. Zero installation damage sustained.\n\n**2. TACTICAL STRENGTHS**\n• Electronic warfare soft-kill prioritization conserved critical kinetic interceptor reserves (3 units disabled via directional RF jamming).\n• Target classification verified at 100% accuracy across incoming contacts.\n\n**3. DOCTRINAL DEFICIENCIES**\n• Stand-off target tracking envelope was maintained efficiently.\n• Interceptor firing discipline: 2 kinetic round(s) expended.\n\n**4. DSSC DIRECTING STAFF DIRECTIVES**\nMaintain primary RF jamming lock beyond 2,500m stand-off distance. Reserve kinetic net pods for high-speed terminal diving munitions. Operator combat-qualified for multi-agent swarm defense."
}
```
- [VERIFIED-RUN] **Status**: **Working** (Verified end-to-end via Python bridge & local Mistral).

---

## 2. LOCAL AI SERVICE INTEGRATION (Ollama REST API)

Hosted on `http://localhost:11434` (macOS Metal Hardware Accelerated):

| Endpoint | Method | Payload / Parameters | Purpose | Status |
|---|---|---|---|---|
| `/api/tags` | `GET` | None | Inventories active local models on device | **Working** [VERIFIED-RUN] |
| `/api/generate` | `POST` | `{"model": "mistral", "prompt": "...", "stream": false}` | Generates raw text completion from Mistral 7.2B | **Working** [VERIFIED-RUN] |

### External Service / Cloud Consumption Audit
- [VERIFIED-RUN] **External Cloud APIs**: None.
- [VERIFIED-RUN] **Monthly / Per-Call API Costs**: ₹0.00 / $0.00.
- [VERIFIED-RUN] **Bandwidth Consumption**: 0 KB external data transfer.
