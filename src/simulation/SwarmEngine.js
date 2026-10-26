import * as THREE from 'three';
import { DroneAgent, THREAT_TYPES, AGENT_STATES } from './DroneAgent.js';

export const BASE_ORIGIN = new THREE.Vector3(0, 0, 0);

export const SCENARIO_PRESETS = [
  {
    id: 'SCENARIO_1',
    name: 'EXERCISE DESERT SHIELD',
    location: 'Pokhran Field Firing Range, Rajasthan',
    threatLevel: 'DEFCON 3',
    description: 'Infiltration by dual loitering munitions and scouting quadcopters under high thermal visibility.',
    threats: [
      { type: 'LOITERING_MUNITION', count: 2, distance: 4200, angleSpread: 45 },
      { type: 'QUADCOPTER', count: 3, distance: 3000, angleSpread: 60 }
    ],
    weather: 'CLEAR',
    nightMode: false
  },
  {
    id: 'SCENARIO_2',
    name: 'EXERCISE MOUNTAIN SENTINEL',
    location: 'Eastern Ladakh FOB, Sub-Zero Sector',
    threatLevel: 'DEFCON 2',
    description: 'Coordinated low-altitude attack by erratic FPV kamikaze drones masked by mountain radar shadows.',
    threats: [
      { type: 'FPV_KAMIKAZE', count: 4, distance: 2800, angleSpread: 75 },
      { type: 'QUADCOPTER', count: 2, distance: 2400, angleSpread: 40 }
    ],
    weather: 'FOG',
    nightMode: true
  },
  {
    id: 'SCENARIO_3',
    name: 'EXERCISE COASTAL SWARM (DSSC BENCHMARK)',
    location: 'INS Hansa Coastal Base, Goa',
    threatLevel: 'DEFCON 1 (MAXIMUM ALERT)',
    description: 'Simultaneous 10-unit autonomous drone swarm attack executing Reynolds flocking split maneuvers.',
    threats: [
      { type: 'QUADCOPTER', count: 6, distance: 4000, angleSpread: 90 },
      { type: 'FPV_KAMIKAZE', count: 3, distance: 3500, angleSpread: 80 },
      { type: 'LOITERING_MUNITION', count: 1, distance: 4800, angleSpread: 20 }
    ],
    weather: 'CLEAR',
    nightMode: false
  }
];

export class SwarmEngine {
  constructor(onStateChange) {
    this.drones = [];
    this.selectedDroneId = null;
    this.scenario = SCENARIO_PRESETS[0];
    this.onStateChange = onStateChange || (() => {});
    
    // Counter-measure assets
    this.rfJammerActive = false;
    this.rfJammerAzimuth = 0.0; // Degrees (0 to 360)
    this.rfJammerElevation = 15.0; // Degrees (0 to 85, true 3D spherical beam)
    this.gnssSpooferActive = false;
    this.kineticAmmo = 8;
    this.kineticArmed = true; // Two-stage firing interlock (DSSC fire-control doctrine)
    this.timeScale = 1.0; // Directing staff drill time dilation (0.0=Pause, 0.5=Slow-Mo, 1.0=Realtime, 2.0=Fast)
    this.activeKineticInterceptors = []; // In-flight projectile visualizers
    
    // Sensor & environment
    this.environment = {
      nightMode: false,
      fogDensity: 0.0,
      radarClutter: false
    };

    // Telemetry & AAR logging
    this.sessionMetrics = {
      startTime: 0,
      elapsedTime: 0,
      totalSpawned: 0,
      neutralizedSoftKill: 0,
      neutralizedHardKill: 0,
      breaches: 0,
      kineticRoundsFired: 0,
      classificationAttempts: 0,
      classificationCorrect: 0,
      firstDetectionTime: null,
      closeProximityDetonations: 0, // Spatial collateral hazard (<120m to base)
      jammerActiveTime: 0, // Total RF emitter active duration
      jammerTargetedTime: 0 // Duration RF beam was locked onto a hostile drone
    };

    this.isRunning = false;
  }

  loadScenario(scenarioId) {
    const s = SCENARIO_PRESETS.find(p => p.id === scenarioId) || SCENARIO_PRESETS[0];
    this.scenario = s;
    this.environment.nightMode = s.nightMode;
    this.environment.fogDensity = s.weather === 'FOG' ? 0.6 : 0.0;
    this.resetSimulation();
  }

  resetSimulation() {
    this.drones = [];
    this.selectedDroneId = null;
    this.rfJammerActive = false;
    this.gnssSpooferActive = false;
    this.kineticAmmo = 8;
    this.activeKineticInterceptors = [];

    this.sessionMetrics = {
      startTime: performance.now(),
      elapsedTime: 0,
      totalSpawned: 0,
      neutralizedSoftKill: 0,
      neutralizedHardKill: 0,
      breaches: 0,
      kineticRoundsFired: 0,
      classificationAttempts: 0,
      classificationCorrect: 0,
      firstDetectionTime: null,
      closeProximityDetonations: 0,
      jammerActiveTime: 0,
      jammerTargetedTime: 0
    };

    // Spawn drones according to active scenario
    let idCounter = 1;
    const baseOrigin = BASE_ORIGIN;

    for (const group of this.scenario.threats) {
      const baseAngle = (Math.random() * 360);
      for (let i = 0; i < group.count; i++) {
        const angle = (baseAngle + (Math.random() - 0.5) * group.angleSpread) * (Math.PI / 180);
        const dist = group.distance + (Math.random() - 0.5) * 400;
        const x = Math.sin(angle) * dist;
        const z = Math.cos(angle) * dist;
        const typeInfo = THREAT_TYPES[group.type];
        const y = typeInfo.defaultAltitude + (Math.random() - 0.5) * 40;

        const trackId = `TRK-${String(1000 + idCounter++)}`;
        const drone = new DroneAgent(
          trackId,
          group.type,
          new THREE.Vector3(x, y, z),
          baseOrigin
        );
        this.drones.push(drone);
        this.sessionMetrics.totalSpawned++;
      }
    }

    if (this.drones.length > 0) {
      this.selectedDroneId = this.drones[0].id;
    }

    this.isRunning = true;
    this.notify();
  }

  update(dt) {
    if (!this.isRunning) return;

    const scaledDt = dt * this.timeScale;
    if (scaledDt === 0) {
      this.notify();
      return;
    }

    this.sessionMetrics.elapsedTime += scaledDt;

    // 1. Update In-Flight Kinetic Projectiles (Ballistic Lead Trajectory & Multi-Target Cluster Burst)
    for (let i = this.activeKineticInterceptors.length - 1; i >= 0; i--) {
      const proj = this.activeKineticInterceptors[i];
      proj.progress += scaledDt / proj.flightDuration;
      const t = Math.min(1.0, proj.progress);

      // Unguided ballistic trajectory towards calculated 2nd-order lead intercept point
      const targetPos = proj.leadTargetPos || proj.targetPos;
      proj.currentPos.lerpVectors(proj.startPos, targetPos, t);
      // Authentic Newtonian quadratic parabola under constant gravity: y = 4 * h * t * (1 - t)
      proj.currentPos.y += 4.0 * 55.0 * t * (1.0 - t);

      const distanceFromOrigin = proj.currentPos.distanceTo(proj.startPos);
      const isArmed = distanceFromOrigin >= 60.0; // Safety arming distance (60m)

      let shouldDetonate = proj.progress >= 1.0;

      // In-flight proximity fuze (armed and within 25m of any active threat)
      if (isArmed && !shouldDetonate) {
        for (const drone of this.drones) {
          if (drone.state !== AGENT_STATES.NEUTRALIZED && proj.currentPos.distanceTo(drone.position) <= 25.0) {
            shouldDetonate = true;
            break;
          }
        }
      }

      if (shouldDetonate) {
        if (isArmed) {
          // Check spatial collateral hazard: detonation inside base inner perimeter (<120m)
          const distToBase = proj.currentPos.distanceTo(BASE_ORIGIN);
          if (distToBase < 120.0) {
            this.sessionMetrics.closeProximityDetonations++;
          }

          // Multi-target Proximity-sphere burst (55m kinetic net capture envelope)
          const netEnvelopeRadius = 55.0;
          for (const drone of this.drones) {
            if (drone.state !== AGENT_STATES.NEUTRALIZED) {
              const missDistance = proj.currentPos.distanceTo(drone.position);
              if (missDistance <= netEnvelopeRadius) {
                if (drone.applyKineticHit()) {
                  this.sessionMetrics.neutralizedHardKill++;
                }
              }
            }
          }
        }
        this.activeKineticInterceptors.splice(i, 1);
      }
    }

    // 2. Update Drone Agents & Track RF Jammer Spectrum
    if (this.rfJammerActive) {
      this.sessionMetrics.jammerActiveTime += scaledDt;
      let threatInBeam = false;
      for (const drone of this.drones) {
        if (drone.state !== AGENT_STATES.NEUTRALIZED) {
          const toD = drone.position.clone().sub(BASE_ORIGIN);
          const gDist = Math.max(1.0, Math.sqrt(toD.x * toD.x + toD.z * toD.z));
          const az = (Math.atan2(toD.x, toD.z) * 180 / Math.PI + 360) % 360;
          const el = (Math.atan2(toD.y, gDist) * 180 / Math.PI);
          let dAz = Math.abs(az - this.rfJammerAzimuth);
          if (dAz > 180) dAz = 360 - dAz;
          const dEl = Math.abs(el - this.rfJammerElevation);
          if (Math.hypot(dAz, dEl) <= 15.0) {
            threatInBeam = true;
            break;
          }
        }
      }
      if (threatInBeam) {
        this.sessionMetrics.jammerTargetedTime += scaledDt;
      }
    }

    for (const drone of this.drones) {
      const prevState = drone.state;

      // Apply RF Jamming with 3D Spherical Beam (Azimuth AND Elevation)
      if (this.rfJammerActive) {
        if (drone.applyJamming(scaledDt, this.rfJammerAzimuth, this.rfJammerElevation)) {
          if (prevState !== AGENT_STATES.JAMMED_RTH) {
            this.sessionMetrics.neutralizedSoftKill++;
          }
        }
      }

      // Update kinematics
      drone.update(scaledDt, this.drones, this.gnssSpooferActive);

      // Track perimeter breach
      if (prevState !== AGENT_STATES.BREACHED && drone.state === AGENT_STATES.BREACHED) {
        this.sessionMetrics.breaches++;
      }
    }

    this.notify();
  }

  selectDrone(droneId) {
    this.selectedDroneId = droneId;
    // H4 fix: track actual user first-detection time
    if (this.sessionMetrics.firstDetectionTime === null && droneId) {
      this.sessionMetrics.firstDetectionTime = this.sessionMetrics.elapsedTime;
    }
    this.notify();
  }

  getSelectedDrone() {
    return this.drones.find(d => d.id === this.selectedDroneId) || null;
  }

  setJammerAngle(azimuthDeg, elevationDeg = null) {
    if (azimuthDeg !== null && azimuthDeg !== undefined) {
      this.rfJammerAzimuth = (azimuthDeg + 360) % 360;
    }
    if (elevationDeg !== null && elevationDeg !== undefined) {
      this.rfJammerElevation = Math.max(0, Math.min(85, elevationDeg));
    } else {
      const selected = this.drones.find(d => d.id === this.selectedDroneId);
      if (selected) {
        const toD = selected.position;
        const groundDist = Math.max(1.0, Math.sqrt(toD.x * toD.x + toD.z * toD.z));
        this.rfJammerElevation = Math.max(0, Math.min(85, (Math.atan2(toD.y, groundDist) * 180 / Math.PI)));
      } else {
        this.rfJammerElevation = 5.0;
      }
    }
    this.notify();
  }

  toggleRfJammer(active) {
    this.rfJammerActive = typeof active === 'boolean' ? active : !this.rfJammerActive;
    this.notify();
  }

  toggleGnssSpoofer() {
    this.gnssSpooferActive = !this.gnssSpooferActive;
    this.notify();
  }

  toggleKineticArm(armed) {
    this.kineticArmed = typeof armed === 'boolean' ? armed : !this.kineticArmed;
    this.notify();
  }

  setTimeScale(scale) {
    this.timeScale = Math.max(0.0, Math.min(4.0, scale));
    this.notify();
  }

  fireKineticNet(targetDroneId) {
    if (!this.kineticArmed || this.kineticAmmo <= 0) return false;
    const target = this.drones.find(d => d.id === targetDroneId);
    if (!target || target.state === AGENT_STATES.NEUTRALIZED) return false;

    this.kineticAmmo--;
    this.sessionMetrics.kineticRoundsFired++;

    const startPos = new THREE.Vector3(0, 20, 0);
    const targetPos = target.position.clone();
    const distance = startPos.distanceTo(targetPos);
    const flightDuration = Math.max(0.4, distance / 600.0); // 600 m/s rocket-propelled net

    // 2nd-Order Taylor Maneuver-Prediction Lead:
    // P_lead = P0 + V * t + 0.5 * A * t^2
    const targetAcc = target.currentAcceleration || target.acceleration || new THREE.Vector3(0, 0, 0);
    const leadTargetPos = targetPos.clone()
      .add(target.velocity.clone().multiplyScalar(flightDuration))
      .add(targetAcc.clone().multiplyScalar(0.5 * flightDuration * flightDuration));

    this.activeKineticInterceptors.push({
      id: Math.random().toString(36).substring(7),
      targetId: target.id,
      startPos,
      leadTargetPos,
      targetPos,
      currentPos: startPos.clone(),
      progress: 0.0,
      flightDuration
    });

    this.notify();
    return true;
  }

  classifySelectedDrone(threatTypeKey) {
    const drone = this.getSelectedDrone();
    if (!drone) return;

    drone.classifiedAs = threatTypeKey;
    this.sessionMetrics.classificationAttempts++;
    if (drone.type.id === threatTypeKey) {
      this.sessionMetrics.classificationCorrect++;
    }
    this.notify();
  }

  setPrioritySelectedDrone(priorityLevel) {
    const drone = this.getSelectedDrone();
    if (!drone) return;
    drone.priority = priorityLevel;
    this.notify();
  }

  notify() {
    this.onStateChange({
      drones: this.drones,
      selectedDrone: this.getSelectedDrone(),
      rfJammerActive: this.rfJammerActive,
      rfJammerAzimuth: this.rfJammerAzimuth,
      rfJammerElevation: this.rfJammerElevation,
      gnssSpooferActive: this.gnssSpooferActive,
      kineticAmmo: this.kineticAmmo,
      kineticArmed: this.kineticArmed,
      timeScale: this.timeScale,
      interceptors: this.activeKineticInterceptors,
      environment: this.environment,
      metrics: this.sessionMetrics,
      scenario: this.scenario
    });
  }
}
