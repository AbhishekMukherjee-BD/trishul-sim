"""
═══════════════════════════════════════════════════════════════════════
PROJECT TRISHUL-SIM: Zero-Dependency Python MAVLink & Ollama Server
SIH26247: Ministry of Defence / Defence Services Staff College (DSSC)
Runs on 100% Standard Library Python (Zero `pip install` required!)
═══════════════════════════════════════════════════════════════════════
"""

import http.server
import socketserver
import urllib.request
import json
import time
import sys

PORT = 8000

SAMPLE_MAVLINK_PACKETS = [
  {
    "message_id": 33,
    "name": "GLOBAL_POSITION_INT",
    "system_id": 1,
    "component_id": 1,
    "fields": {
      "time_boot_ms": int(time.time() * 1000) % 1000000,
      "lat": 341525000,  # Ladakh FOB Latitude (degrees * 1e7)
      "lon": 775775000,  # Ladakh FOB Longitude (degrees * 1e7)
      "alt": 3520000,    # Altitude MSL (mm)
      "relative_alt": 180000, # 180m AGL
      "vx": -1520,       # -15.2 m/s
      "vy": 2840,        # 28.4 m/s
      "vz": -120,
      "hdg": 14200       # 142.0 degrees heading
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
]

class TrishulHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable Cross-Origin Resource Sharing (CORS)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        if self.path == '/api/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            resp = {
                "status": "OPERATIONAL",
                "system": "TRISHUL-SIM C-UAS TELEMETRY BRIDGE",
                "protocol": "MAVLink v2.0",
                "timestamp": time.time()
            }
            self.wfile.write(json.dumps(resp).encode('utf-8'))

        elif self.path == '/api/mavlink/sample_packets':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            resp = {
                "protocol": "MAVLink v2.0",
                "packets": SAMPLE_MAVLINK_PACKETS,
                "compatibility": ["PX4 Autopilot", "ArduPilot", "QGroundControl"]
            }
            self.wfile.write(json.dumps(resp).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        if self.path == '/api/aar/evaluate':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            try:
                payload = json.loads(body)
            except Exception:
                payload = {}

            scenario_name = payload.get('scenario_name', 'Tactical Exercise')
            total = payload.get('total_threats', 6)
            soft = payload.get('soft_kills', 0)
            hard = payload.get('hard_kills', 0)
            breaches = payload.get('breaches', 0)
            ammo = payload.get('kinetic_rounds', 0)
            acc = payload.get('classification_accuracy', 100)
            elapsed = payload.get('elapsed_time_sec', 60)

            prompt = f"""You are Directing Staff at the Defence Services Staff College (DSSC), Indian Armed Forces.
Evaluate this Counter-UAS simulation drill strictly according to Indian air-defense doctrine:
Operation: {scenario_name}
Threats Ingressed: {total}
Soft-Kill Neutralizations (RF Jammer): {soft}
Hard-Kill Neutralizations (Kinetic Net): {hard}
Perimeter Breaches: {breaches}
Kinetic Ammo Expended: {ammo}
Classification Accuracy: {acc}%
Engagement Duration: {elapsed}s

Provide an authoritative tactical After-Action Review (AAR):
1. Operational Overview
2. Tactical Strengths
3. Doctrinal Deficiencies
4. DSSC Directing Staff Directives
Keep response under 180 words in crisp military debrief tone."""

            debrief_result = None
            # Attempt to query local Ollama if available
            try:
                req = urllib.request.Request(
                    "http://localhost:11434/api/generate",
                    data=json.dumps({"model": "mistral", "prompt": prompt, "stream": False}).encode("utf-8"),
                    headers={"Content-Type": "application/json"}
                )
                with urllib.request.urlopen(req, timeout=15) as r:
                    res_data = json.loads(r.read().decode("utf-8"))
                    debrief_result = res_data.get("response")
            except Exception:
                pass

            if not debrief_result:
                debrief_result = f"""**1. OPERATIONAL OVERVIEW**
Unit successfully intercepted {soft + hard}/{total} hostile UAS tracks during {scenario_name}. {f'ALERT: {breaches} perimeter breach(es) detected.' if breaches > 0 else 'Zero installation damage sustained.'}

**2. TACTICAL STRENGTHS**
• Electronic warfare soft-kill prioritization conserved critical kinetic interceptor reserves ({soft} units disabled via directional RF jamming).
• Target classification verified at {acc}% accuracy across incoming contacts.

**3. DOCTRINAL DEFICIENCIES**
• {f'Severe: Delayed engagement resulted in terminal dive breach within 250m base boundary.' if breaches > 0 else 'Stand-off target tracking envelope was maintained efficiently.'}
• Interceptor firing discipline: {ammo} kinetic round(s) expended.

**4. DSSC DIRECTING STAFF DIRECTIVES**
Maintain primary RF jamming lock beyond 2,500m stand-off distance. Reserve kinetic net pods for high-speed terminal diving munitions. Operator combat-qualified for multi-agent swarm defense."""

            try:
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"debrief": debrief_result}).encode('utf-8'))
            except (BrokenPipeError, ConnectionResetError):
                pass
        else:
            self.send_response(404)
            self.end_headers()

def run_server():
    print(f"===============================================================")
    print(f"🛡️  TRISHUL-SIM MAVLink & DSSC Bridge Server running on port {PORT}")
    print(f"📡 API Health: http://localhost:{PORT}/api/health")
    print(f"📦 MAVLink Stream: http://localhost:{PORT}/api/mavlink/sample_packets")
    print(f"===============================================================")
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), TrishulHandler) as httpd:
        httpd.serve_forever()

if __name__ == '__main__':
    run_server()
