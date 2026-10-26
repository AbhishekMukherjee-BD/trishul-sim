// ═══════════════════════════════════════════════════════════════════════
// PROJECT TRISHUL-SIM: Deep Subsystem Automated Verification & Audit
// ═══════════════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { SwarmEngine, SCENARIO_PRESETS, BASE_ORIGIN } from './src/simulation/SwarmEngine.js';
import { DroneAgent, THREAT_TYPES, AGENT_STATES } from './src/simulation/DroneAgent.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runAudit() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("🛡️  TRISHUL-SIM DEEP ARCHITECTURAL & OPERATIONAL AUDIT");
  console.log("═══════════════════════════════════════════════════════════════\n");

  // TEST 1: DroneAgent instantiation and properties
  console.log("▶ TEST SUITE 1: DroneAgent Kinematics & States");
  const testDrone = new DroneAgent('TEST-01', 'QUADCOPTER', new THREE.Vector3(2000, 100, 2000), BASE_ORIGIN);
  assert(testDrone.id === 'TEST-01', "Drone ID correctly assigned");
  assert(testDrone.type.id === 'QUADCOPTER', "Threat type correctly mapped");
  assert(testDrone.state === AGENT_STATES.INGRESS, "Initial state is INGRESS");
  assert(testDrone.altitude === 100, "Altitude initialized correctly");

  // Step physics across 3 frames
  const initialDist = testDrone.position.distanceTo(BASE_ORIGIN);
  for (let i = 0; i < 3; i++) {
    testDrone.update(0.1, [testDrone], false);
  }
  assert(testDrone.position.distanceTo(BASE_ORIGIN) < initialDist, "Drone moves toward base on update");
  assert(testDrone.trail.length > 0, "Trail history generates points");

  // Test Kinetic hit
  const hitResult = testDrone.applyKineticHit();
  assert(hitResult === true, "Kinetic net hit returns true on active drone");
  assert(testDrone.state === AGENT_STATES.NEUTRALIZED, "Drone transitions to NEUTRALIZED");
  testDrone.update(0.1, [testDrone], false);
  assert(testDrone.position.y < 100, "Neutralized drone descends in free-fall");

  // TEST 2: SwarmEngine Scenario Loading & Simulation
  console.log("\n▶ TEST SUITE 2: SwarmEngine Lifecycle & Multi-Scenario Loading");
  let lastState = null;
  const engine = new SwarmEngine((state) => { lastState = state; });

  for (const s of SCENARIO_PRESETS) {
    engine.loadScenario(s.id);
    assert(engine.scenario.id === s.id, `Loaded scenario ${s.id} (${s.name})`);
    assert(engine.drones.length > 0, `Spawned ${engine.drones.length} drones for ${s.id}`);
    assert(engine.selectedDroneId !== null, `Auto-selected first drone ${engine.selectedDroneId}`);
  }

  // TEST 3: Soft-Kill Electronic Warfare (Directional RF Jammer)
  console.log("\n▶ TEST SUITE 3: Counter-Measure Subsystems (EW Soft-Kill)");
  engine.loadScenario('SCENARIO_1');
  // In tactical doctrine, commercial quadcopters with 2.4GHz C2 are prime targets for directional EW jamming
  const targetDrone = engine.drones.find(d => d.type.id === 'QUADCOPTER') || engine.drones[0];
  engine.selectDrone(targetDrone.id);

  // Point jammer directly at target drone with 3D boresight (Azimuth + Elevation)
  const toDrone = targetDrone.position.clone().sub(BASE_ORIGIN);
  const groundDist = Math.max(1.0, Math.sqrt(toDrone.x * toDrone.x + toDrone.z * toDrone.z));
  const targetAzimuth = (Math.atan2(toDrone.x, toDrone.z) * 180 / Math.PI + 360) % 360;
  const targetElevation = (Math.atan2(toDrone.y, groundDist) * 180 / Math.PI);
  engine.setJammerAngle(targetAzimuth, targetElevation);
  engine.toggleRfJammer(true);
  assert(engine.rfJammerActive === true, "RF Jammer activated");

  // Dwell jammer with active 3D bore-sight tracking until soft-kill threshold (accounting for inverse-square EM law)
  for (let i = 0; i < 60; i++) {
    const toD = targetDrone.position.clone().sub(BASE_ORIGIN);
    const gDist = Math.max(1.0, Math.sqrt(toD.x * toD.x + toD.z * toD.z));
    const az = (Math.atan2(toD.x, toD.z) * 180 / Math.PI + 360) % 360;
    const el = (Math.atan2(toD.y, gDist) * 180 / Math.PI);
    engine.setJammerAngle(az, el);
    engine.update(0.1);
    if (targetDrone.state === AGENT_STATES.JAMMED_RTH) break;
  }
  assert(targetDrone.state === AGENT_STATES.JAMMED_RTH, `Target drone jammed into JAMMED_RTH state (state=${targetDrone.state})`);
  assert(engine.sessionMetrics.neutralizedSoftKill > 0, "Soft-kill metric incremented");

  // TEST 4: Hard-Kill Point Defense (Kinetic Net Interceptor)
  console.log("\n▶ TEST SUITE 4: Kinetic Interceptor Ballistics");
  const targetDrone2 = engine.drones.find(d => d.state === AGENT_STATES.INGRESS);
  assert(targetDrone2 !== undefined, "Found second active target drone");
  const ammoBefore = engine.kineticAmmo;
  const fired = engine.fireKineticNet(targetDrone2.id);
  assert(fired === true, "Kinetic net pod fired successfully");
  assert(engine.kineticAmmo === ammoBefore - 1, "Ammo decremented by 1");
  assert(engine.activeKineticInterceptors.length > 0, "Interceptor projectile in flight");

  // Step simulation until interceptor hits (flight duration ~3-5s at 600m/s)
  for (let i = 0; i < 80; i++) {
    engine.update(0.1);
    if (targetDrone2.state === AGENT_STATES.NEUTRALIZED) break;
  }
  assert(targetDrone2.state === AGENT_STATES.NEUTRALIZED, "Target drone neutralized by kinetic interceptor");
  assert(engine.sessionMetrics.neutralizedHardKill > 0, "Hard-kill metric incremented");

  // TEST 5: Target Classification
  console.log("\n▶ TEST SUITE 5: Sensor Fusion & Threat Classification");
  engine.selectDrone(targetDrone2.id);
  engine.classifySelectedDrone(targetDrone2.type.id);
  assert(engine.sessionMetrics.classificationAttempts === 1, "Classification attempt logged");
  assert(engine.sessionMetrics.classificationCorrect === 1, "Correct classification recognized");

  // TEST 6: Backend HTTP Health & MAVLink API
  console.log("\n▶ TEST SUITE 6: Python MAVLink & Telemetry Bridge (`server/app.py`)");
  try {
    const healthRes = await fetch('http://localhost:8000/api/health');
    assert(healthRes.status === 200, "Backend /api/health responds with HTTP 200");
    const healthData = await healthRes.json();
    assert(healthData.status === "OPERATIONAL", "Backend status is OPERATIONAL");
    assert(healthData.protocol === "MAVLink v2.0", "Protocol is MAVLink v2.0");

    const mavRes = await fetch('http://localhost:8000/api/mavlink/sample_packets');
    assert(mavRes.status === 200, "Backend /api/mavlink/sample_packets responds with HTTP 200");
    const mavData = await mavRes.json();
    assert(Array.isArray(mavData.packets) && mavData.packets.length > 0, "MAVLink packets array valid");
  } catch (err) {
    assert(false, `Backend connection failed: ${err.message}`);
  }

  // TEST 7: Local Ollama Mistral AAR Connection
  console.log("\n▶ TEST SUITE 7: Local Sovereign AI Brain (Ollama Mistral)");
  try {
    const tagsRes = await fetch('http://localhost:11434/api/tags');
    assert(tagsRes.status === 200, "Ollama /api/tags responds with HTTP 200");
    const tagsData = await tagsRes.json();
    const hasMistral = tagsData.models.some(m => m.name.includes('mistral'));
    assert(hasMistral, "Mistral model found in local Ollama inventory");

    // Test AAR endpoint with Ollama
    const aarRes = await fetch('http://localhost:8000/api/aar/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenario_name: 'Desert Shield Drill',
        total_threats: 5,
        soft_kills: 3,
        hard_kills: 2,
        breaches: 0,
        kinetic_rounds: 2,
        classification_accuracy: 100,
        elapsed_time_sec: 45
      })
    });
    assert(aarRes.status === 200, "Backend /api/aar/evaluate responds with HTTP 200");
    const aarData = await aarRes.json();
    assert(typeof aarData.debrief === 'string' && aarData.debrief.length > 50, "AAR Debrief text generated successfully");
  } catch (err) {
    assert(false, `Ollama / AAR evaluation failed: ${err.message}`);
  }

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log(`📊 AUDIT SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("═══════════════════════════════════════════════════════════════");
  if (failed > 0) process.exit(1);
}

runAudit().catch(err => {
  console.error("Fatal audit error:", err);
  process.exit(1);
});
