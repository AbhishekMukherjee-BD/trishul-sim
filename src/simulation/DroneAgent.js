import * as THREE from 'three';

export const THREAT_TYPES = {
  QUADCOPTER: {
    id: 'QUADCOPTER',
    name: 'Commercial Quadcopter',
    code: 'UAV-QUAD',
    maxSpeed: 16.0,
    maxForce: 2.2,
    rcs_dbsm: -20.0,
    baseFrequency: '2.4 GHz FHSS',
    acousticWhineHz: 5200,
    meshColor: 0xffaa00,
    defaultAltitude: 120.0,
    payloadThreat: 'ISR Surveillance'
  },
  FPV_KAMIKAZE: {
    id: 'FPV_KAMIKAZE',
    name: 'FPV Kamikaze Drone',
    code: 'UAV-FPV',
    maxSpeed: 42.0,
    maxForce: 6.5,
    rcs_dbsm: -23.0,
    baseFrequency: '5.8 GHz Analog',
    acousticWhineHz: 7800,
    meshColor: 0xff2a3b,
    defaultAltitude: 80.0,
    payloadThreat: 'HE-FRAG Warhead'
  },
  LOITERING_MUNITION: {
    id: 'LOITERING_MUNITION',
    name: 'Fixed-Wing Loitering Munition',
    code: 'UAV-WING',
    maxSpeed: 32.0,
    maxForce: 1.8,
    rcs_dbsm: -10.0,
    baseFrequency: '900 MHz Telemetry',
    acousticWhineHz: 3400,
    meshColor: 0xff4488,
    defaultAltitude: 280.0,
    payloadThreat: 'Shaped Charge Armor-Piercing'
  }
};

export const AGENT_STATES = {
  INGRESS: 'INGRESS',
  EVADING: 'EVADING',
  JAMMED_RTH: 'JAMMED_RTH',
  NEUTRALIZED: 'NEUTRALIZED',
  BREACHED: 'BREACHED'
};

export class DroneAgent {
  constructor(id, typeKey, startPos, targetBase = new THREE.Vector3(0, 0, 0)) {
    this.id = id;
    this.type = THREAT_TYPES[typeKey] || THREAT_TYPES.QUADCOPTER;
    this.position = startPos.clone();
    this.velocity = new THREE.Vector3().subVectors(targetBase, startPos).normalize().multiplyScalar(this.type.maxSpeed * 0.5);
    this.acceleration = new THREE.Vector3();
    this.targetBase = targetBase;
    
    this.state = AGENT_STATES.INGRESS;
    this.health = 100;
    this.jamDwellTimer = 0.0; // Seconds jammed continuously
    this.heading = 0.0;
    this.altitude = this.position.y;
    this.isLocked = false;
    this.classifiedAs = null; // User's submitted classification
    this.priority = 'UNASSIGNED'; // ALPHA, BRAVO, CHARLIE
    
    // Trail history for 3D trajectory rendering
    this.trail = [];
    this.trailMax = 20;
    this.lastTrailTick = 0;
  }

  update(dt, allDrones, spooferActive = false) {
    if (this.state === AGENT_STATES.NEUTRALIZED) {
      // Free fall to ground
      this.position.y -= 35.0 * dt;
      if (this.position.y <= 0) {
        this.position.y = 0;
      }
      return;
    }

    if (this.state === AGENT_STATES.BREACHED) {
      return;
    }

    // 1. Calculate Flocking & Ingress Forces
    this.acceleration.set(0, 0, 0);

    if (this.state === AGENT_STATES.JAMMED_RTH) {
      // Soft-killed: turn around, ascend, and flee away from base
      const fleeVector = new THREE.Vector3().subVectors(this.position, this.targetBase).normalize();
      fleeVector.y = 0.4; // Climb out
      this.acceleration.add(fleeVector.multiplyScalar(this.type.maxSpeed * 1.5));
    } else if (spooferActive) {
      // GNSS Spoofer induces coordinate drift and erratic wandering
      const wander = new THREE.Vector3(
        (Math.random() - 0.5) * 50.0,
        (Math.random() - 0.5) * 20.0,
        (Math.random() - 0.5) * 50.0
      );
      this.acceleration.add(wander);
    } else {
      // Standard Ingress + Reynolds Flocking
      const seekForce = this.seek(this.targetBase);
      const separationForce = this.separate(allDrones);
      const alignmentForce = this.align(allDrones);
      const cohesionForce = this.cohere(allDrones);

      // Weight forces
      seekForce.multiplyScalar(1.2);
      separationForce.multiplyScalar(2.0);
      alignmentForce.multiplyScalar(0.8);
      cohesionForce.multiplyScalar(0.6);

      this.acceleration.add(seekForce);
      this.acceleration.add(separationForce);
      this.acceleration.add(alignmentForce);
      this.acceleration.add(cohesionForce);
    }

    // 2. Integrate Velocity & Position (Euler)
    this.velocity.add(this.acceleration.multiplyScalar(dt));
    this.velocity.clampLength(0, this.type.maxSpeed);
    this.position.add(this.velocity.clone().multiplyScalar(dt));

    // Clamp minimum altitude above ground
    if (this.position.y < 30.0) {
      this.position.y = 30.0;
      this.velocity.y = Math.max(0, this.velocity.y);
    }

    this.altitude = this.position.y;
    this.heading = Math.atan2(this.velocity.x, this.velocity.z) * (180 / Math.PI);

    // 3. Check Base Perimeter Breach
    const distToBase = this.position.distanceTo(this.targetBase);
    if (distToBase < 250.0 && this.state === AGENT_STATES.INGRESS) {
      this.state = AGENT_STATES.BREACHED;
    }

    // 4. Update Trail
    this.lastTrailTick += dt;
    if (this.lastTrailTick > 0.15) {
      this.lastTrailTick = 0;
      this.trail.push(this.position.clone());
      if (this.trail.length > this.trailMax) {
        this.trail.shift();
      }
    }
  }

  seek(target) {
    const desired = new THREE.Vector3().subVectors(target, this.position);
    desired.normalize().multiplyScalar(this.type.maxSpeed);
    const steer = new THREE.Vector3().subVectors(desired, this.velocity);
    steer.clampLength(0, this.type.maxForce);
    return steer;
  }

  separate(drones) {
    const desiredSeparation = 120.0;
    const steer = new THREE.Vector3();
    let count = 0;

    for (const other of drones) {
      if (other.id === this.id || other.state === AGENT_STATES.NEUTRALIZED) continue;
      const d = this.position.distanceTo(other.position);
      if (d > 0 && d < desiredSeparation) {
        const diff = new THREE.Vector3().subVectors(this.position, other.position);
        diff.normalize().divideScalar(d); // Closer = stronger force
        steer.add(diff);
        count++;
      }
    }

    if (count > 0) {
      steer.divideScalar(count);
      steer.normalize().multiplyScalar(this.type.maxSpeed);
      steer.sub(this.velocity);
      steer.clampLength(0, this.type.maxForce * 1.5);
    }
    return steer;
  }

  align(drones) {
    const neighborDist = 250.0;
    const sum = new THREE.Vector3();
    let count = 0;

    for (const other of drones) {
      if (other.id === this.id || other.state === AGENT_STATES.NEUTRALIZED) continue;
      const d = this.position.distanceTo(other.position);
      if (d > 0 && d < neighborDist) {
        sum.add(other.velocity);
        count++;
      }
    }

    if (count > 0) {
      sum.divideScalar(count);
      sum.normalize().multiplyScalar(this.type.maxSpeed);
      const steer = new THREE.Vector3().subVectors(sum, this.velocity);
      steer.clampLength(0, this.type.maxForce);
      return steer;
    }
    return new THREE.Vector3();
  }

  cohere(drones) {
    const neighborDist = 300.0;
    const sum = new THREE.Vector3();
    let count = 0;

    for (const other of drones) {
      if (other.id === this.id || other.state === AGENT_STATES.NEUTRALIZED) continue;
      const d = this.position.distanceTo(other.position);
      if (d > 0 && d < neighborDist) {
        sum.add(other.position);
        count++;
      }
    }

    if (count > 0) {
      sum.divideScalar(count);
      return this.seek(sum);
    }
    return new THREE.Vector3();
  }

  applyJamming(dt, jammerAzimuthDeg, jammerElevationDeg = 15.0, maxJamRange = 5000.0) {
    if (this.state !== AGENT_STATES.INGRESS && this.state !== AGENT_STATES.EVADING) return false;

    const toDrone = new THREE.Vector3().subVectors(this.position, this.targetBase);
    const dist = toDrone.length();
    if (dist > maxJamRange || dist <= 0.001) return false;

    // Unit vector towards drone
    const droneDir = toDrone.clone().normalize();

    // Unit vector of jammer beam in 3D spherical coordinates (Azimuth θ from North/Z, Elevation φ from ground)
    const azRad = (jammerAzimuthDeg) * (Math.PI / 180);
    const elRad = (jammerElevationDeg) * (Math.PI / 180);
    const jammerDir = new THREE.Vector3(
      Math.sin(azRad) * Math.cos(elRad),
      Math.sin(elRad),
      Math.cos(azRad) * Math.cos(elRad)
    ).normalize();

    // 3D Solid Angle alignment via dot product: cos(angle) = A · B
    const dot = Math.max(-1.0, Math.min(1.0, jammerDir.dot(droneDir)));
    const angleDiffDeg = Math.acos(dot) * (180 / Math.PI);

    // Realistic 15-degree conical beam solid angle
    const inBeam = angleDiffDeg <= 15.0;

    if (inBeam) {
      // Inverse-square EM power propagation law & link susceptibility
      // At close range (<1500m), power is intense; at standoff (>3500m), power density drops significantly
      const rangeRatio = 1800.0 / Math.max(400.0, dist);
      const powerDensityFactor = Math.min(2.5, Math.max(0.25, Math.pow(rangeRatio, 1.6)));
      
      // Electronic Warfare link susceptibility:
      // Commercial 2.4GHz C2 is vulnerable (1.15x); 5.8GHz analog VTX is moderate (0.95x); 900MHz telemetry with frequency agility is hardened (0.75x)
      const susceptibility = this.type.id === 'QUADCOPTER' ? 1.15 : this.type.id === 'FPV_KAMIKAZE' ? 0.95 : 0.75;
      
      const effectiveAccumulationRate = powerDensityFactor * susceptibility;
      this.jamDwellTimer += dt * effectiveAccumulationRate;

      // Base required dwell threshold (2.5s nominal at 1800m)
      if (this.jamDwellTimer >= 2.5) {
        this.state = AGENT_STATES.JAMMED_RTH;
        return true;
      }
    } else {
      // Link recovery decay when beam wanders off target
      this.jamDwellTimer = Math.max(0, this.jamDwellTimer - dt * 0.85);
    }
    return false;
  }

  applyKineticHit() {
    if (this.state !== AGENT_STATES.NEUTRALIZED) {
      this.state = AGENT_STATES.NEUTRALIZED;
      return true;
    }
    return false;
  }
}
