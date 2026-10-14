import * as THREE from 'three';

const TAU = Math.PI * 2;
const garments = ['jacket', 'knit', 'trousers'];

/** A photographic fashion installation with real geometry, light and depth. */
export function createShowroom(canvas, { compact = false, onSelect = () => {} } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch {
    canvas.dataset.fallback = 'true';
    return { select() {}, setColor() {}, reset() {}, dispose() {}, setActive() {} };
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 60);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const disposedResources = new Set();
  let disposed = false, active = true, frame = 0, time = 0, lastTime = 0;
  let targetAngle = 0, currentAngle = 0, selected = 0, dragging = false;
  const pointer = new THREE.Vector2(), smoothPointer = new THREE.Vector2();
  const materials = [];
  const colorUniforms = { mode: { value: 0 }, tint: { value: new THREE.Color('#6b3924') } };
  const geometries = [];
  const own = (resource) => { (resource.isMaterial ? materials : geometries).push(resource); return resource; };
  const stone = own(new THREE.MeshStandardMaterial({ color: '#c8bba6', roughness: 0.88, metalness: 0.03 }));
  const lightStone = own(new THREE.MeshStandardMaterial({ color: '#e5ded0', roughness: 0.8 }));
  const bronze = own(new THREE.MeshStandardMaterial({ color: '#b88954', metalness: 0.68, roughness: 0.27, emissive: '#604021', emissiveIntensity: 0.16 }));
  const darkBronze = own(new THREE.MeshStandardMaterial({ color: '#49362a', metalness: 0.5, roughness: 0.34 }));
  scene.add(new THREE.HemisphereLight(0xfff4de, 0x6d5847, 2.5));
  const key = new THREE.DirectionalLight(0xffedce, 4);
  key.position.set(-4, 6, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -7;
  key.shadow.camera.right = 7;
  key.shadow.camera.top = 5;
  key.shadow.camera.bottom = -5;
  key.shadow.normalBias = 0.045;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 2.5);
  rim.position.set(4, 3, -3);
  scene.add(rim);

  const installation = new THREE.Group();
  scene.add(installation);
  function cylinder(radius, height, y, material, parent = installation) {
    const mesh = new THREE.Mesh(own(new THREE.CylinderGeometry(radius, radius, height, 96)), material);
    mesh.position.y = y;
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function ring(radius, thickness, material, parent = installation) {
    const mesh = new THREE.Mesh(own(new THREE.TorusGeometry(radius, thickness, 10, 120)), material);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }

  const baseRadius = compact ? 1.8 : 4.35;
  cylinder(baseRadius, 0.13, -1.68, darkBronze);
  cylinder(baseRadius * 0.97, 0.12, -1.55, lightStone);
  cylinder(baseRadius * 0.9, 0.08, -1.45, stone);
  const ground = new THREE.Mesh(own(new THREE.PlaneGeometry(24, 24)), own(new THREE.ShadowMaterial({ color: '#62432f', opacity: 0.17 })));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.77;
  ground.receiveShadow = true;
  scene.add(ground);
  const floorOrbit = ring(compact ? 1.96 : 4.57, 0.013, bronze);
  floorOrbit.rotation.x = -Math.PI / 2;
  floorOrbit.position.y = -1.66;
  const orbit = ring(compact ? 2.16 : 4.35, compact ? 0.026 : 0.018, bronze);
  orbit.position.set(0, compact ? 0.1 : -0.15, compact ? -0.45 : -1.6);
  orbit.rotation.set(compact ? 0.08 : 0.65, compact ? -0.3 : 0, -0.2);
  const secondOrbit = ring(compact ? 2.2 : 4.39, 0.008, bronze);
  secondOrbit.position.copy(orbit.position);
  secondOrbit.rotation.set(compact ? 0.6 : 0.66, compact ? 0.5 : 0.03, 0.28);

  const loader = new THREE.TextureLoader();
  const count = compact ? 1 : 3;
  const pieces = [];
  for (let i = 0; i < count; i++) {
    const group = new THREE.Group();
    installation.add(group);
    const photoHeight = compact ? 3.1 : i === 2 ? 2.8 : 2.7;
    const photoWidth = compact ? 2.81 : i === 2 ? 1.78 : 2.45;
    const geometry = own(new THREE.PlaneGeometry(photoWidth, photoHeight, 22, 24));
    const positions = geometry.attributes.position;
    for (let v = 0; v < positions.count; v++) {
      const x = positions.getX(v) / photoWidth;
      const y = positions.getY(v) / photoHeight;
      positions.setZ(v, Math.cos(x * Math.PI) * 0.11 + Math.sin(y * Math.PI) * 0.018);
    }
    geometry.computeVertexNormals();
    const material = own(new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.09, side: THREE.DoubleSide, toneMapped: false, depthWrite: true }));
    if (compact) {
      material.onBeforeCompile = (shader) => {
        shader.uniforms.showroomColorMode = colorUniforms.mode;
        shader.uniforms.showroomTint = colorUniforms.tint;
        shader.fragmentShader = 'uniform float showroomColorMode;\nuniform vec3 showroomTint;\n' + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
          float showroomLuminance = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
          vec3 showroomRecolor = showroomTint * sqrt(max(showroomLuminance, 0.0)) * 2.2;
          diffuseColor.rgb = mix(diffuseColor.rgb, showroomRecolor, showroomColorMode);
        `);
      };
      material.customProgramCacheKey = () => 'aethel-photographic-tint-v1';
    }
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = compact ? 0.38 : 0.38;
    mesh.castShadow = true;
    mesh.visible = false;
    group.add(mesh);
    const depthMaterial = own(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, alphaTest: 0.12 }));
    mesh.customDepthMaterial = depthMaterial;
    const pedestal = cylinder(compact ? 1.33 : 1.1, compact ? 0.35 : 0.23, compact ? -1.24 : -1.28, lightStone, group);
    cylinder(compact ? 1.4 : 1.14, 0.035, compact ? -1.05 : -1.15, bronze, group);
    const texture = loader.load(`/images/${garments[i]}.webp`, () => {
      if (disposed) { texture.dispose(); return; }
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4);
      material.map = texture;
      depthMaterial.map = texture;
      material.needsUpdate = depthMaterial.needsUpdate = true;
      mesh.visible = true;
      canvas.dataset.ready = 'true';
      if (!active) renderer.render(scene, camera);
    }, undefined, () => { canvas.dataset.fallback = 'true'; });
    disposedResources.add(texture);
    pieces.push({ group, mesh, pedestal, phase: i * TAU / 3 });
  }

  function resize() {
    if (disposed) return;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width), height = Math.max(1, rect.height);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.position.set(0, compact ? 1.35 : 2.2, compact ? Math.max(7.1, 4.65 / camera.aspect) : Math.max(10.4, 7.3 / camera.aspect));
    camera.lookAt(0, compact ? -0.12 : -0.3, 0);
    camera.updateProjectionMatrix();
    if (!active) renderer.render(scene, camera);
  }
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  const wrapIndex = (index) => ((index % 3) + 3) % 3;
  function select(index) {
    selected = wrapIndex(index);
    if (!compact) {
      const desired = -selected * TAU / 3;
      targetAngle = currentAngle + THREE.MathUtils.euclideanModulo(desired - currentAngle + Math.PI, TAU) - Math.PI;
    }
    onSelect(selected);
  }
  let startX = 0, startAngle = 0, travel = 0;
  function down(event) {
    if (event.button !== undefined && event.button !== 0) return;
    dragging = true;
    startX = event.clientX;
    startAngle = targetAngle;
    travel = 0;
    canvas.setPointerCapture?.(event.pointerId);
    canvas.style.cursor = 'grabbing';
  }
  function move(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, (event.clientY - rect.top) / rect.height * 2 - 1);
    if (dragging) {
      travel = event.clientX - startX;
      targetAngle = startAngle + travel / Math.max(rect.width, 1) * (compact ? 0.65 : TAU);
    }
  }
  function up(event) {
    if (!dragging) return;
    dragging = false;
    canvas.style.cursor = 'grab';
    if (canvas.hasPointerCapture?.(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    if (compact) targetAngle = 0;
    else if (Math.abs(travel) > 5) select(Math.round(-targetAngle / (TAU / 3)));
    else {
      const rect = canvas.getBoundingClientRect();
      const hitPointer = new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
      const ray = new THREE.Raycaster();
      ray.setFromCamera(hitPointer, camera);
      const hit = ray.intersectObjects(pieces.map(piece => piece.mesh))[0];
      if (hit) select(pieces.findIndex(piece => piece.mesh === hit.object));
    }
  }
  function leave() { if (!dragging) pointer.set(0, 0); }
  canvas.style.touchAction = 'pan-y';
  canvas.style.cursor = 'grab';
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('pointerleave', leave);

  function tick(stamp) {
    frame = 0;
    if (disposed || !active) return;
    const dt = lastTime ? Math.min((stamp - lastTime) / 1000, 0.05) : 1 / 60;
    lastTime = stamp;
    time += dt;
    const ease = reducedMotion ? 1 : 1 - Math.exp(-dt * 5);
    currentAngle = THREE.MathUtils.lerp(currentAngle, targetAngle, ease);
    smoothPointer.lerp(pointer, reducedMotion ? 0 : ease);
    installation.rotation.y = compact ? currentAngle + smoothPointer.x * 0.13 : smoothPointer.x * 0.025;
    installation.rotation.x = reducedMotion ? 0 : smoothPointer.y * 0.025;
    if (!reducedMotion) {
      orbit.rotation.y = (compact ? -0.3 : 0) + Math.sin(time * 0.3) * (compact ? 0.15 : 0.035);
      secondOrbit.rotation.y = (compact ? 0.5 : 0.03) + Math.sin(time * 0.22) * 0.1;
    }
    for (const piece of pieces) {
      if (!compact) {
        const angle = currentAngle + piece.phase;
        piece.group.position.set(Math.sin(angle) * 2.75, 0, Math.cos(angle) * 1.55 - 0.55);
        const depthScale = 0.84 + (Math.cos(angle) + 1) * 0.08;
        piece.group.scale.setScalar(depthScale);
        piece.mesh.rotation.y = -installation.rotation.y + Math.sin(angle) * 0.13;
      }
      piece.mesh.position.y = 0.38 + (reducedMotion ? 0 : Math.sin(time * 0.65 + piece.phase) * 0.065);
    }
    renderer.render(scene, camera);
    frame = requestAnimationFrame(tick);
  }
  frame = requestAnimationFrame(tick);
  return {
    select,
    setColor(hex) {
      const color = String(hex).toLowerCase();
      colorUniforms.mode.value = color === '#6b3924' ? 0 : 1;
      colorUniforms.tint.value.set(hex);
      if (!active && !disposed) renderer.render(scene, camera);
    },
    reset() { pointer.set(0, 0); select(0); },
    setActive(value) {
      active = Boolean(value);
      if (!active && frame) { cancelAnimationFrame(frame); frame = 0; lastTime = 0; }
      else if (active && !frame && !disposed) frame = requestAnimationFrame(tick);
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', up);
      canvas.removeEventListener('pointerleave', leave);
      for (const resource of [...geometries, ...materials, ...disposedResources]) resource.dispose();
      renderer.dispose();
    },
  };
}
