import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function RadarViewport({
  drones = [],
  selectedDrone = null,
  rfJammerActive = false,
  rfJammerAzimuth = 0,
  interceptors = [],
  onSelectDrone = () => {},
  environment = {}
}) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const dronesGroupRef = useRef(null);
  const radarSweepMeshRef = useRef(null);
  const jammerConeRef = useRef(null);
  const interceptorGroupRef = useRef(null);

  // Drag / orbit state
  const isDraggingRef = useRef(false);
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const cameraAngleRef = useRef({ theta: Math.PI / 4, phi: Math.PI / 3.2, radius: 4200 });

  useEffect(() => {
    if (!mountRef.current) return;
    const width = mountRef.current.clientWidth || 800;
    const height = mountRef.current.clientHeight || 500;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x06080c);
    scene.fog = new THREE.FogExp2(0x06080c, environment.fogDensity > 0 ? 0.0003 : 0.00006);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 10, 30000);
    cameraRef.current = camera;
    updateCameraPosition();

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0x223344, 1.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xd4af37, 2.5);
    dirLight.position.set(3000, 5000, 3000);
    scene.add(dirLight);

    const blueLight = new THREE.DirectionalLight(0x00e5ff, 1.2);
    blueLight.position.set(-3000, 2000, -3000);
    scene.add(blueLight);

    // 3. Grid & Concentric Range Rings
    const gridHelper = new THREE.GridHelper(10000, 40, 0xd4af37, 0x111c2a);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // Concentric Range Rings: 1000m, 2500m, 5000m
    const ringDistances = [1000, 2500, 5000];
    ringDistances.forEach((radius, idx) => {
      const ringGeo = new THREE.RingGeometry(radius - 8, radius + 8, 96);
      const isOuter = idx === 2;
      const ringMat = new THREE.MeshBasicMaterial({
        color: isOuter ? 0xd4af37 : 0x00ff66,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: isOuter ? 0.5 : 0.35
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 1;
      scene.add(ring);
    });

    // 4. Base Installation at Origin (0,0,0)
    const baseGroup = new THREE.Group();
    // Geodesic Radome Dome
    const domeGeo = new THREE.SphereGeometry(80, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMat = new THREE.MeshStandardMaterial({
      color: 0x162436,
      metalness: 0.9,
      roughness: 0.2,
      emissive: 0xd4af37,
      emissiveIntensity: 0.2
    });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    baseGroup.add(dome);

    // Hexagonal Tower Base
    const towerGeo = new THREE.CylinderGeometry(110, 140, 45, 6);
    const towerMat = new THREE.MeshStandardMaterial({ color: 0x0a121c, roughness: 0.8 });
    const tower = new THREE.Mesh(towerGeo, towerMat);
    tower.position.y = -22.5;
    baseGroup.add(tower);

    // Base Critical Perimeter Danger Ring (250m)
    const dangerRingGeo = new THREE.RingGeometry(240, 260, 64);
    const dangerRingMat = new THREE.MeshBasicMaterial({
      color: 0xff2a3b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6
    });
    const dangerRing = new THREE.Mesh(dangerRingGeo, dangerRingMat);
    dangerRing.rotation.x = Math.PI / 2;
    dangerRing.position.y = 2;
    baseGroup.add(dangerRing);

    scene.add(baseGroup);

    // 4b. Cardinal Direction Labels (N/S/E/W)
    const cardinals = [
      { label: 'N', x: 0, z: -5300 },
      { label: 'S', x: 0, z: 5300 },
      { label: 'E', x: 5300, z: 0 },
      { label: 'W', x: -5300, z: 0 }
    ];
    cardinals.forEach(({ label, x, z }) => {
      const cCanvas = document.createElement('canvas');
      cCanvas.width = 64;
      cCanvas.height = 64;
      const cCtx = cCanvas.getContext('2d');
      cCtx.font = 'bold 48px monospace';
      cCtx.fillStyle = '#d4af37';
      cCtx.textAlign = 'center';
      cCtx.textBaseline = 'middle';
      cCtx.fillText(label, 32, 32);
      const cTex = new THREE.CanvasTexture(cCanvas);
      const cMat = new THREE.SpriteMaterial({ map: cTex, transparent: true });
      const cSprite = new THREE.Sprite(cMat);
      cSprite.position.set(x, 30, z);
      cSprite.scale.set(300, 300, 1);
      scene.add(cSprite);
    });

    // 5. 360° PPI Radar Sweep Mesh
    const sweepGroup = new THREE.Group();
    const sweepGeo = new THREE.RingGeometry(20, 5100, 64, 1, 0, Math.PI / 4);
    const sweepMat = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      uniforms: {
        color: { value: new THREE.Color(0x00ff66) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        varying vec2 vUv;
        void main() {
          float alpha = (1.0 - vUv.x) * 0.35;
          gl_FragColor = vec4(color, alpha);
        }
      `
    });
    const sweepMesh = new THREE.Mesh(sweepGeo, sweepMat);
    sweepMesh.rotation.x = -Math.PI / 2;
    sweepMesh.position.y = 4;
    sweepGroup.add(sweepMesh);
    scene.add(sweepGroup);
    radarSweepMeshRef.current = sweepGroup;

    // 6. Directional RF Jammer Visual Conic Beam
    const jammerGeo = new THREE.ConeGeometry(950, 3600, 32, 1, true);
    const jammerMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide
    });
    const jammerCone = new THREE.Mesh(jammerGeo, jammerMat);
    jammerCone.position.set(0, 0, 0);
    jammerCone.visible = false;
    scene.add(jammerCone);
    jammerConeRef.current = jammerCone;

    // 7. Dynamic Groups
    const dronesGroup = new THREE.Group();
    scene.add(dronesGroup);
    dronesGroupRef.current = dronesGroup;

    const interceptorGroup = new THREE.Group();
    scene.add(interceptorGroup);
    interceptorGroupRef.current = interceptorGroup;

    // 8. Animation Loop
    let animationFrameId;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      if (radarSweepMeshRef.current) {
        radarSweepMeshRef.current.rotation.y -= delta * 1.5;
      }

      renderer.render(scene, camera);
    };
    animate();

    // 9. Resize Observer
    const resizeObserver = new ResizeObserver(() => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      if (w === 0 || h === 0) return;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    });
    resizeObserver.observe(mountRef.current);

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(animationFrameId);
      if (rendererRef.current && rendererRef.current.domElement) {
        rendererRef.current.dispose();
        mountRef.current?.removeChild(rendererRef.current.domElement);
      }
    };
  }, []);

  // Update Camera Orbit
  const updateCameraPosition = () => {
    if (!cameraRef.current) return;
    const { theta, phi, radius } = cameraAngleRef.current;
    const x = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.cos(theta);
    cameraRef.current.position.set(x, y, z);
    cameraRef.current.lookAt(0, 80, 0);
  };

  // Update Jammer Conic Beam
  useEffect(() => {
    if (!jammerConeRef.current) return;
    jammerConeRef.current.visible = rfJammerActive;
    if (rfJammerActive) {
      const rad = (rfJammerAzimuth * Math.PI) / 180;
      const halfLength = 1800;
      jammerConeRef.current.position.set(
        Math.sin(rad) * halfLength,
        180,
        Math.cos(rad) * halfLength
      );
      jammerConeRef.current.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(Math.sin(rad), 0.08, Math.cos(rad)).normalize()
      );
    }
  }, [rfJammerActive, rfJammerAzimuth]);

  // Update Drones in 3D Scene — POOLED (no rebuild per frame)
  const dronePoolRef = useRef(new Map());
  const trailLinesRef = useRef(new Map());

  useEffect(() => {
    if (!dronesGroupRef.current) return;
    const group = dronesGroupRef.current;
    const pool = dronePoolRef.current;
    const trailPool = trailLinesRef.current;
    const activeDroneIds = new Set(drones.map(d => d.id));

    // Remove pooled drones no longer in the list
    for (const [id, droneObj] of pool.entries()) {
      if (!activeDroneIds.has(id)) {
        group.remove(droneObj.group);
        droneObj.group.traverse(child => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
            else child.material.dispose();
          }
        });
        pool.delete(id);
      }
    }
    // Remove old trails
    for (const [id, trailLine] of trailPool.entries()) {
      if (!activeDroneIds.has(id)) {
        group.remove(trailLine);
        trailLine.geometry.dispose();
        trailLine.material.dispose();
        trailPool.delete(id);
      }
    }

    // Create or update each drone
    drones.forEach(drone => {
      const isSelected = selectedDrone && selectedDrone.id === drone.id;
      const isNeutralized = drone.state === 'NEUTRALIZED';
      const isJammed = drone.state === 'JAMMED_RTH';

      let markerColor = drone.type.meshColor;
      if (isNeutralized) markerColor = 0x556677;
      else if (isJammed) markerColor = 0x00e5ff;
      else if (isSelected) markerColor = 0x00ff66;

      let pooled = pool.get(drone.id);

      if (!pooled) {
        // CREATE new pooled drone (only happens once per drone)
        const droneGroup = new THREE.Group();
        droneGroup.userData = { id: drone.id };

        // Hull Mesh
        const hullGeo = new THREE.ConeGeometry(40, 90, 8);
        const hullMat = new THREE.MeshStandardMaterial({
          color: markerColor,
          emissive: markerColor,
          emissiveIntensity: 0.35,
          metalness: 0.6,
          roughness: 0.3
        });
        const hull = new THREE.Mesh(hullGeo, hullMat);
        hull.rotation.x = Math.PI / 2;
        droneGroup.add(hull);

        // Tactical Bracket Ring
        const bracketGeo = new THREE.RingGeometry(75, 88, 4);
        const bracketMat = new THREE.MeshBasicMaterial({
          color: markerColor,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.6
        });
        const bracket = new THREE.Mesh(bracketGeo, bracketMat);
        bracket.rotation.z = Math.PI / 4;
        droneGroup.add(bracket);

        // Altitude Stalk
        const stalkGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0, -drone.position.y, 0)
        ]);
        const stalkMat = new THREE.LineBasicMaterial({
          color: markerColor,
          transparent: true,
          opacity: 0.4
        });
        const stalk = new THREE.Line(stalkGeo, stalkMat);
        droneGroup.add(stalk);

        // Ground Shadow
        const shadowGeo = new THREE.CircleGeometry(45, 16);
        const shadowMat = new THREE.MeshBasicMaterial({
          color: markerColor,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.45
        });
        const shadow = new THREE.Mesh(shadowGeo, shadowMat);
        shadow.rotation.x = Math.PI / 2;
        droneGroup.add(shadow);

        // Billboard Label Sprite
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.position.set(0, 110, 0);
        sprite.scale.set(220, 55, 1);
        droneGroup.add(sprite);

        group.add(droneGroup);
        pooled = { group: droneGroup, hull, hullMat, bracket, bracketMat, stalk, stalkGeo, stalkMat, shadow, shadowMat, sprite, texture, canvas };
        pool.set(drone.id, pooled);
      }

      // UPDATE pooled drone position & visuals
      pooled.group.position.copy(drone.position);
      pooled.hull.rotation.z = -drone.heading * (Math.PI / 180);
      pooled.hullMat.color.setHex(markerColor);
      pooled.hullMat.emissive.setHex(markerColor);
      pooled.hullMat.emissiveIntensity = isSelected ? 0.8 : 0.35;
      pooled.bracketMat.color.setHex(isSelected ? 0x00ff66 : (isNeutralized ? 0x444444 : markerColor));
      pooled.bracketMat.opacity = isSelected ? 0.9 : 0.6;
      pooled.stalkMat.color.setHex(markerColor);
      pooled.shadowMat.color.setHex(markerColor);
      pooled.shadow.position.y = -drone.position.y + 1;

      // Update stalk geometry
      const stalkPoints = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, -drone.position.y, 0)
      ];
      pooled.stalk.geometry.setFromPoints(stalkPoints);

      // Update label canvas (throttled via check)
      const distKm = (drone.position.distanceTo(new THREE.Vector3(0, 0, 0)) / 1000).toFixed(1);
      const labelKey = `${drone.id}_${isSelected}_${distKm}_${Math.round(drone.altitude)}_${drone.state}`;
      if (pooled._lastLabelKey !== labelKey) {
        pooled._lastLabelKey = labelKey;
        const ctx = pooled.canvas.getContext('2d');
        ctx.clearRect(0, 0, 256, 64);
        ctx.fillStyle = 'rgba(6, 8, 12, 0.75)';
        ctx.fillRect(0, 0, 256, 64);
        ctx.strokeStyle = isSelected ? '#00ff66' : '#d4af37';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, 254, 62);
        ctx.font = 'bold 22px monospace';
        ctx.fillStyle = isSelected ? '#00ff66' : '#ffffff';
        ctx.fillText(drone.id, 10, 28);
        ctx.font = '16px monospace';
        ctx.fillStyle = '#90a0b6';
        ctx.fillText(`RNG:${distKm}k | ALT:${Math.round(drone.altitude)}m`, 10, 52);
        pooled.texture.needsUpdate = true;
      }

      // Render trail (L7 fix)
      if (drone.trail && drone.trail.length > 1) {
        let trailLine = trailPool.get(drone.id);
        const trailGeo = new THREE.BufferGeometry().setFromPoints(drone.trail);
        if (trailLine) {
          trailLine.geometry.dispose();
          trailLine.geometry = trailGeo;
          trailLine.material.color.setHex(markerColor);
        } else {
          const trailMat = new THREE.LineBasicMaterial({ color: markerColor, transparent: true, opacity: 0.25 });
          trailLine = new THREE.Line(trailGeo, trailMat);
          group.add(trailLine);
          trailPool.set(drone.id, trailLine);
        }
      }
    });
  }, [drones, selectedDrone]);

  // Update Kinetic Interceptors — POOLED
  const interceptorPoolRef = useRef([]);
  useEffect(() => {
    if (!interceptorGroupRef.current) return;
    const group = interceptorGroupRef.current;
    const pool = interceptorPoolRef.current;

    // Ensure enough pooled interceptor meshes exist
    while (pool.length < interceptors.length) {
      const rocketGeo = new THREE.SphereGeometry(25, 16, 16);
      const rocketMat = new THREE.MeshBasicMaterial({ color: 0xffea00 });
      const rocket = new THREE.Mesh(rocketGeo, rocketMat);
      rocket.visible = false;
      group.add(rocket);
      pool.push(rocket);
    }

    // Update positions and visibility
    pool.forEach((rocket, i) => {
      if (i < interceptors.length) {
        rocket.position.copy(interceptors[i].currentPos);
        rocket.visible = true;
      } else {
        rocket.visible = false;
      }
    });
  }, [interceptors]);

  // Orbit / Interaction Mouse Handlers
  const handleMouseDown = (e) => {
    isDraggingRef.current = true;
    prevMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - prevMouseRef.current.x;
    const dy = e.clientY - prevMouseRef.current.y;
    prevMouseRef.current = { x: e.clientX, y: e.clientY };

    cameraAngleRef.current.theta -= dx * 0.005;
    cameraAngleRef.current.phi = Math.max(
      0.15,
      Math.min(Math.PI / 2 - 0.05, cameraAngleRef.current.phi - dy * 0.005)
    );
    updateCameraPosition();
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e) => {
    e.preventDefault();
    cameraAngleRef.current.radius = Math.max(
      800,
      Math.min(9500, cameraAngleRef.current.radius + e.deltaY * 3.5)
    );
    updateCameraPosition();
  };

  const handleClick = (e) => {
    if (!mountRef.current || !cameraRef.current || !dronesGroupRef.current) return;
    const rect = mountRef.current.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cameraRef.current);
    const intersects = raycaster.intersectObjects(dronesGroupRef.current.children, true);

    if (intersects.length > 0) {
      let topObj = intersects[0].object;
      while (topObj.parent && topObj.parent !== dronesGroupRef.current) {
        topObj = topObj.parent;
      }
      if (topObj.userData && topObj.userData.id) {
        onSelectDrone(topObj.userData.id);
      }
    }
  };

  return (
    <div
      ref={mountRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onClick={handleClick}
      className="relative w-full h-full cursor-grab active:cursor-grabbing overflow-hidden"
      style={{ minHeight: '380px' }}
    >
      {/* Tactical HUD Overlays */}
      <div className="absolute top-3 left-3 pointer-events-none z-10 flex flex-col gap-1 bg-black/50 p-2 rounded border border-[var(--border-subtle)] backdrop-blur">
        <div className="text-[10px] uppercase font-bold tracking-widest text-[#d4af37] mono-hud">
          3D AIR DEFENSE RADAR // 5,000M ENVELOPE
        </div>
        <div className="text-[11px] text-[#00ff66] mono-hud font-bold">
          ROTATION: 30 RPM // AESA MULTI-TRACK ACTIVE
        </div>
      </div>

      <div className="absolute bottom-3 right-3 pointer-events-none z-10 text-right mono-hud bg-black/50 p-2 rounded border border-[var(--border-subtle)] backdrop-blur">
        <div className="text-[10px] text-gray-300">
          ALTITUDE: WGS-84 // ZOOM: SCROLL WHEEL
        </div>
        <div className="text-[10px] text-[#d4af37] font-bold">
          DRAG MOUSE TO ORBIT // CLICK BLIP TO LOCK
        </div>
      </div>
    </div>
  );
}
