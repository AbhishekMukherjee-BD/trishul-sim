# 🛡️ PROJECT TRISHUL-SIM
### AI-Enabled Tactical Drone & Counter-Drone Threat Simulation Trainer
**Smart India Hackathon (SIH) Problem Statement ID:** `SIH26247`  
**Ministry / Organization:** Ministry of Defence (MoD) / Defence Services Staff College (DSSC)  
**Theme:** Robotics and Drones | **Category:** Software Edition

---

## ⚡ Quick Start (100% Offline Capable)

### 1. Frontend Tactical Console (React 19 + Three.js)
```bash
npm install
npm run dev
```
Open **`http://localhost:5173/`** in your browser.

### 2. MAVLink Telemetry Bridge & DSSC Server (Python Zero-Dependency)
```bash
python3 server/app.py
```
API running on `http://localhost:8000/api/health` and `http://localhost:8000/api/mavlink/sample_packets`.

---

## 🎯 What is TRISHUL-SIM?

TRISHUL-SIM is a browser-based, zero-installation 3D tactical air-defense and Counter-UAS (C-UAS) simulation trainer built for troop training at unit level with minimal specialized hardware.

### Key Capabilities:
1. **3D Plan Position Indicator (PPI) Radar**:
   * Concentric tactical range rings ($1\text{ km}$, $2.5\text{ km}$, $5\text{ km}$) with real-time 30 RPM phosphor beam sweep.
   * Interactive 3D contact selection, altitude drop-lines, and 3D trajectory tracking.
2. **Autonomous Swarm Robotics Kinematics**:
   * Multi-agent **Reynolds Flocking (Boids algorithm)**: Separation, Alignment, Cohesion, and Target Ingress vectors.
   * 3 Distinct Threat Archetypes: Commercial Quadcopter, FPV Kamikaze Drone, and Fixed-Wing Loitering Munition.
3. **Multi-Modal Sensor Suite**:
   * Primary 3D AESA Radar metrics.
   * Real-time RF Direction Finder & Spectrum Waterfall (2.4 GHz, 5.8 GHz VTX, 900 MHz LoRa).
   * Acoustic motor whine frequency analyzer.
4. **Optical FLIR Thermal Viewport**:
   * Military-grade GLSL shaders adapted from tactical FLIR cameras: **White-Hot (WHOT)**, **Black-Hot (BHOT)**, **Ironbow Predator**, and **NVG PVS-14 Phosphor Green**.
   * Dynamic tracking reticle, laser rangefinder, and $1\times, 4\times, 12\times$ optical zoom.
5. **Counter-UAS (C-UAS) Weapons Suite**:
   * **Directional RF Jammer (Soft-Kill)**: $15^\circ$ conical beam, manual azimuth slider, auto snap-to-target, and $2.5\text{ s}$ dwell lock-on triggering Return-to-Home (RTH).
   * **Kinetic Net Interceptor Pod (Hard-Kill)**: Rocket-propelled anti-drone net with ballistic flight animation and ammo management.
   * **GNSS Area Spoofer**: Area-of-effect coordinate drift breaking swarm formation cohesion.
6. **Autonomous After-Action Review (AAR)**:
   * Quantitative scoring: Combat Readiness Grade (A+, B, C, FAIL), classification accuracy, soft/hard kill efficiency, perimeter breach counts.
   * Local AI Tactical Doctrine debriefing (Ollama Llama-3 integration with offline rule engine fallback).
   * Exportable DSSC doctrine evaluation report.
7. **Native MAVLink v2 Integration**:
   * Python bridge decoding standard `GLOBAL_POSITION_INT` and `ATTITUDE` telemetry packets from PX4/ArduPilot drones.

---

## 🏆 SIH Grand Finale 2-Minute Pitch Script

> *"Respected Judges, modern warfare has proven that cheap commercial drone swarms are a lethal threat. Yet today, our armed forces rely on classroom lectures or live-fire drills that cost thousands of rupees per flight hour and are weather-dependent.*
>
> *We built **TRISHUL-SIM**—a zero-install, 100% offline tactical C-UAS simulator running right here in the browser on ordinary ruggedized hardware.*
>
> *Here on screen, you see an incoming 10-drone swarm executing real autonomous **Reynolds Flocking swarm robotics math**.*
>
> *Our multi-sensor fusion suite detects their RF control frequencies on 2.4 and 5.8 GHz, analyzes their motor acoustic whine, and tracks them on our 3D radar.*
>
> *We switch our optical sensor into **FLIR Thermal Ironbow mode** to lock onto the lead FPV kamikaze. Instead of wasting expensive kinetic rounds, we align our **Directional RF Jammer**—holding a 2.5-second electronic lock to sever its control link and force a Return-to-Home.*
>
> *For the fast terminal diving drone, we launch our **Kinetic Net Interceptor**, dropping it in mid-air.*
>
> *And as soon as the drill ends, our **Local AI Tactical Debrief Engine** analyzes the soldier's telemetry against official Indian air-defense doctrine, assigning a combat readiness score and actionable operational directives.*
>
> *It also connects directly to open-source **MAVLink v2 telemetry streams**, allowing seamless integration with real drone autopilots.*
>
> *Thank you."*
