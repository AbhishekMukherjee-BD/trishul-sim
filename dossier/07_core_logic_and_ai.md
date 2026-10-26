# ═══════════════════════════════════════════════════════════════════════════════
# TRISHUL-SIM: CORE LOGIC, ALGORITHMS & SOVEREIGN AI (07_core_logic_and_ai.md)
# ═══════════════════════════════════════════════════════════════════════════════

## 1. REYNOLDS BOIDS SWARM KINEMATICS & BASE INGRESS ALGORITHM

The multi-UAS threat swarm in TRISHUL-SIM is driven by an autonomous decentralized flocking engine (`src/simulation/DroneAgent.js:L91-L155`) based on Craig Reynolds' Boids algorithm combined with base-seeking attraction forces.

### Kinematics Vector Formulas
For each drone agent $i$ with position vector $\mathbf{p}_i$ and velocity vector $\mathbf{v}_i$:

$$\mathbf{a}_i = 1.2 \cdot \mathbf{F}_{\text{seek}} + 2.0 \cdot \mathbf{F}_{\text{separate}} + 0.8 \cdot \mathbf{F}_{\text{align}} + 0.6 \cdot \mathbf{F}_{\text{cohere}}$$

1. **Target Base Seeking Force ($\mathbf{F}_{\text{seek}}$)**:
   - Target Base: $\mathbf{B} = (0, 0, 0)$
   - Desired Velocity: $\mathbf{v}_{\text{desired}} = \frac{\mathbf{B} - \mathbf{p}_i}{\|\mathbf{B} - \mathbf{p}_i\|} \cdot v_{\text{max}}$
   - Steering Force: $\mathbf{F}_{\text{seek}} = \text{clamp}(\mathbf{v}_{\text{desired}} - \mathbf{v}_i, F_{\text{max}})$
2. **Crowd Separation Force ($\mathbf{F}_{\text{separate}}$)**:
   - Evaluated across all neighbor drones within $d_{\text{sep}} = 120.0$ meters:
   $$\mathbf{F}_{\text{separate}} = \frac{1}{N} \sum_{j \neq i, \|\mathbf{p}_i - \mathbf{p}_j\| < 120} \frac{\mathbf{p}_i - \mathbf{p}_j}{\|\mathbf{p}_i - \mathbf{p}_j\|^2}$$
3. **Flock Heading Alignment Force ($\mathbf{F}_{\text{align}}$)**:
   - Evaluated across neighbor drones within $d_{\text{align}} = 250.0$ meters:
   $$\mathbf{v}_{\text{avg}} = \frac{1}{N} \sum_{j \neq i, \|\mathbf{p}_i - \mathbf{p}_j\| < 250} \mathbf{v}_j, \quad \mathbf{F}_{\text{align}} = \text{clamp}\left(\frac{\mathbf{v}_{\text{avg}}}{\|\mathbf{v}_{\text{avg}}\|} \cdot v_{\text{max}} - \mathbf{v}_i, F_{\text{max}}\right)$$
4. **Flock Centroid Cohesion Force ($\mathbf{F}_{\text{cohere}}$)**:
   - Evaluated across neighbor drones within $d_{\text{cohere}} = 300.0$ meters:
   $$\mathbf{C}_{\text{avg}} = \frac{1}{N} \sum_{j \neq i, \|\mathbf{p}_i - \mathbf{p}_j\| < 300} \mathbf{p}_j, \quad \mathbf{F}_{\text{cohere}} = \text{seek}(\mathbf{C}_{\text{avg}})$$

### Euler Integration & Altitude Clamping
$$\mathbf{v}_i(t + \Delta t) = \text{clamp}\Big(\mathbf{v}_i(t) + \mathbf{a}_i \cdot \Delta t, \ 0, \ v_{\text{max}}\Big)$$
$$\mathbf{p}_i(t + \Delta t) = \mathbf{p}_i(t) + \mathbf{v}_i(t + \Delta t) \cdot \Delta t$$
- [VERIFIED-READ] Altitude Clamp (`DroneAgent.js:L132`): If $y < 30.0$m, set $y = 30.0$m and clamp $v_y \ge 0$ to prevent terrain collision before terminal strike.

---

## 2. COUNTERMEASURE EFFECTOR LOGIC & HEURISTICS

### A. Directional RF Jammer (Soft-Kill)
- [VERIFIED-READ] Implemented in `src/simulation/DroneAgent.js:L235-L257`.
- **Target Vector**: $\mathbf{d} = \mathbf{p}_i - \mathbf{B}$
- **Angular Offset Calculation**:
  $$\theta_{\text{drone}} = \left(\text{atan2}(d_x, d_z) \cdot \frac{180}{\pi} + 360\right) \pmod{360}$$
  $$\Delta \theta = \big|(\theta_{\text{drone}} - \theta_{\text{jammer}} + 180) \pmod{360} - 180\big|$$
- **Trigger Conditions**:
  - Distance: $\|\mathbf{d}\| \le 5,000.0$ meters.
  - Angular Beam Margin: $\Delta \theta \le 20.0^\circ$ (conical beam envelope).
- **Dwell Timer Accumulation**:
  - If inside beam: $t_{\text{dwell}} \leftarrow t_{\text{dwell}} + \Delta t$.
  - If outside beam: $t_{\text{dwell}} \leftarrow \max(0, t_{\text{dwell}} - \Delta t \cdot 0.5)$ (gradual recovery).
- **State Transition**: When $t_{\text{dwell}} \ge 2.5$ seconds, drone state shifts to `JAMMED_RTH`.
- **Soft-Kill Flight Behavior**: In `JAMMED_RTH`, the drone turns 180° away from the base, accelerates to $1.5 \cdot v_{\text{max}}$, and climbs with $v_y = +0.4 \cdot v_{\text{max}}$ (`DroneAgent.js:L94-L98`).

### B. Kinetic Net Interceptor (Hard-Kill)
- [VERIFIED-READ] Implemented in `src/simulation/SwarmEngine.js:L154-L170`, `L225-L250`.
- **Launch Parameters**: Launch origin $(0, 20, 0)$ with speed $v_{\text{rocket}} = 600.0$ m/s.
- **Flight Duration Formula**: $T_{\text{flight}} = \max\left(0.4, \frac{\|\mathbf{p}_{\text{target}} - \mathbf{p}_{\text{origin}}\|}{600.0}\right)$.
- **Dynamic Vector Tracking**: At each frame progress $s = \frac{t}{T_{\text{flight}}}$:
  $$\mathbf{p}_{\text{interceptor}}(s) = (1 - s) \cdot \mathbf{p}_{\text{origin}} + s \cdot \mathbf{p}_{\text{target}}(t)$$
- **Impact Evaluation**: When $s \ge 1.0$, calls `targetDrone.applyKineticHit()`, setting state to `NEUTRALIZED` and triggering a 35 m/s gravitational free-fall (`DroneAgent.js:L78-L85`).

### C. GNSS Area Spoofer
- [VERIFIED-READ] Implemented in `src/simulation/DroneAgent.js:L100-L106`.
- Injects pseudorandom Gaussian-like acceleration noise:
  $$\mathbf{a}_{\text{spoof}} = \big(\text{rand}(-25, 25), \ \text{rand}(-10, 10), \ \text{rand}(-25, 25)\big) \ \text{m/s}^2$$
  causing incoming swarms to lose cohesive alignment and scatter.

---

## 3. COMBAT READINESS SCORING ALGORITHM

*(Implemented in `src/components/AARDebriefModal.jsx:L20-L56`)*

$$\text{Score} = 100 - 25 \cdot B - 15 \cdot U - 0.15 \cdot (100 - A_{\text{class}}) - 5 \cdot W_{\text{ammo}} - P_{\text{TTD}} - P_{\text{duration}}$$

Where:
- $B$: Total perimeter breaches (hostile ingress $< 250$m).
- $U$: Unaddressed threats remaining ($\max(0, \text{Total} - \text{Neutralized} - B)$).
- $A_{\text{class}}$: Trainee threat classification accuracy percentage ($0–100\%$).
- $W_{\text{ammo}}$: Wasted kinetic rounds ($\max(0, \text{Rounds Fired} - \text{Confirmed Hard Kills})$).
- $P_{\text{TTD}}$: Time-to-First-Detection penalty ($-5$ pts if TTD $> 10$s; $-10$ pts if TTD $> 20$s).
- $P_{\text{duration}}$: Extended engagement penalty ($-5$ pts if elapsed time $> 120$s).
- Clamped strictly: $\text{Score} \in [0, 100]$.

---

## 4. LOCAL SOVEREIGN AI DIRECTING STAFF (Ollama Mistral)

### Model Configuration
- [VERIFIED-READ] **Model Name**: `mistral:latest` (Ollama 7.2B parameter instruction-tuned model).
- [VERIFIED-READ] **Quantization**: `Q4_K_M` GGUF.
- [VERIFIED-READ] **Context Window**: 32,768 tokens.
- [VERIFIED-READ] **Endpoint**: `http://localhost:11434/api/generate`.
- [VERIFIED-READ] **Parameters**: `stream: false`, default temperature.
- [VERIFIED-READ] **Timeout**: 15,000 ms via `AbortController`.
- [VERIFIED-READ] **Financial Cost**: ₹0.00 / $0.00 (100% on-device local GPU/NPU inference).

### Verbatim Prompt Template (Frontend Client)
*(Extracted verbatim from `src/components/AARDebriefModal.jsx:L65-L82`)*

```text
You are Directing Staff at the Defence Services Staff College (DSSC), Indian Armed Forces.
Provide an official tactical After-Action Review (AAR) for this Counter-UAS drill:
Scenario: ${scenario.name}
Total Drone Threats: ${total}
Soft-Kill (RF Jammer): ${metrics.neutralizedSoftKill || 0}
Hard-Kill (Kinetic Net): ${metrics.neutralizedHardKill || 0}
Perimeter Breaches: ${breaches}
Kinetic Rounds Expended: ${metrics.kineticRoundsFired || 0}
Classification Accuracy: ${classificationAcc}%
Time-to-Detect: ${ttd.toFixed(1)}s
Time Elapsed: ${Math.round(metrics.elapsedTime || 0)}s
Combat Readiness Score: ${combatScore}/100

Format concisely with:
1. Operational Overview
2. Tactical Strengths
3. Doctrinal Deficiencies
4. DSSC Corrective Directives. Keep under 180 words, crisp military tone.
```

### Deterministic Rule Engine Fallback (Rule R9)
If Ollama is offline or times out after 15 seconds, the application instantly evaluates the metrics against the deterministic DSSC rule engine (`AARDebriefModal.jsx:L110-L115`):
- **Operational Overview**: Dynamic assessment of $N_{\text{neutralized}} / N_{\text{total}}$ with breach alert.
- **Tactical Strengths**: Quantitative audit of EW soft-kills vs. kinetic conservation and classification accuracy.
- **Doctrinal Deficiencies**: Flags dive-profile interdiction delays and ammunition wastage.
- **Directing Staff Directives**: Mandates stand-off RF lock $>2,500$m and qualifies or remands operator.

---

## 5. HARDCODED THRESHOLDS & MAGIC NUMBERS AUDIT

| Parameter / Magic Number | Value | Location in Codebase | Doctrinal / Engineering Justification |
|---|---|---|---|
| **Base Coordinate** | `(0, 0, 0)` | `SwarmEngine.js:L4` | Center of local tactical defence coordinate system |
| **Inner Breach Radius** | `250.0 m` | `DroneAgent.js:L142` | Lethal blast radius of loitering munition warhead |
| **Point Defense Radius** | `1,500.0 m` | `RadarViewport.jsx:L73` | Effective envelope for kinetic interceptor launch |
| **Stand-Off Jammer Range** | `5,000.0 m` | `DroneAgent.js:L235` | Maximum effective range of directional RF jamming beam |
| **Jammer Conical Angle** | `20.0°` | `DroneAgent.js:L248` | Physical beam divergence of directional horn antenna |
| **Jammer Dwell Threshold** | `2.5 s` | `DroneAgent.js:L249` | Time required for drone flight controller to failover to RTH |
| **Kinetic Net Rocket Speed** | `600.0 m/s` | `SwarmEngine.js:L237` | Mach 1.75 rocket-propelled net interceptor velocity |
| **Kinetic Ammo Magazine** | `8 rounds` | `SwarmEngine.js:L60` | Point-defense launcher payload pod capacity |
| **Drone Terminal Fall Rate** | `35.0 m/s` | `DroneAgent.js:L80` | Terminal velocity of neutralized airframe under gravity |
| **AAR Ingress Linger Grace** | `5.0 s` | `App.jsx:L149` | Minimum elapsed time before auto-triggering AAR modal |
