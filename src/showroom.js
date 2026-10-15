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
  const stone = own(new THREE.MeshStandardMaterial({ color: '#d5cfc2', roughness: 0.94, metalness: 0.01 }));
  const iron = own(new THREE.MeshStandardMaterial({ color: '#343632', metalness: 0.64, roughness: 0.5 }));
  const nickel = own(new THREE.MeshStandardMaterial({ color: '#9a9b92', metalness: 0.76, roughness: 0.4 }));
  scene.add(new THREE.HemisphereLight(0xfffaf0, 0x72716a, 2.3));
  const key = new THREE.DirectionalLight(0xfff6e8, 3.1);
  key.position.set(-4, 6, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -7;
  key.shadow.camera.right = 7;
  key.shadow.camera.top = 5;
  key.shadow.camera.bottom = -5;
  key.shadow.normalBias = 0.045;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 1.8);
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
  function rod(from, to, radius, material, parent = installation) {
    const start = new THREE.Vector3(...from), end = new THREE.Vector3(...to);
    const mesh = new THREE.Mesh(own(new THREE.CylinderGeometry(radius, radius, start.distanceTo(end), 12)), material);
    mesh.position.copy(start).add(end).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize());
    parent.add(mesh);
    return mesh;
  }

  // A single stone plinth gives the garments an architectural setting.
  const floor = cylinder(compact ? 1.87 : 4.15, 0.075, -1.42, stone);
  floor.scale.z = compact ? 0.53 : 0.57;
  const ground = new THREE.Mesh(own(new THREE.PlaneGeometry(24, 24)), own(new THREE.ShadowMaterial({ color: '#30332c', opacity: 0.055 })));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.47;
  ground.receiveShadow = true;
  scene.add(ground);

  // Diffused contact shadows avoid turning a photographic plane into a hard cutout.
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 128;
  const shadowContext = shadowCanvas.getContext('2d');
  const gradient = shadowContext.createRadialGradient(64, 64, 4, 64, 64, 62);
  gradient.addColorStop(0, 'rgba(35,38,31,0.28)');
  gradient.addColorStop(0.45, 'rgba(35,38,31,0.12)');
  gradient.addColorStop(1, 'rgba(35,38,31,0)');
  shadowContext.fillStyle = gradient;
  shadowContext.fillRect(0, 0, 128, 128);
  const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
  disposedResources.add(shadowTexture);
  const shadowMaterial = own(new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false, toneMapped: false }));

  const loader = new THREE.TextureLoader();
  const count = compact ? 1 : 3;
  const pieces = [];
  for (let i = 0; i < count; i++) {
    const group = new THREE.Group();
    installation.add(group);
    const photoHeight = compact ? 3.1 : i === 2 ? 2.8 : 2.7;
    const photoWidth = photoHeight * [1.067, 1.094, 0.667][i];
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
    mesh.castShadow = false;
    mesh.visible = false;
    group.add(mesh);
    const depthMaterial = own(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, alphaTest: 0.12 }));
    mesh.customDepthMaterial = depthMaterial;
    const shadow = new THREE.Mesh(own(new THREE.PlaneGeometry(compact ? 3.25 : 2.5, compact ? 1.65 : 1.4)), shadowMaterial);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0, -1.377, 0.08);
    group.add(shadow);

    const collarHeight = 0.38 + photoHeight / 2;
    const railHeight = collarHeight + 0.25;
    const supportX = compact ? 1.64 : 0;
    rod([supportX, -1.377, -0.34], [supportX, railHeight, -0.34], compact ? 0.018 : 0.014, iron, group);
    rod([supportX, railHeight, -0.34], [0, railHeight, -0.34], 0.014, iron, group);
    rod([supportX - 0.3, -1.368, -0.34], [supportX + 0.3, -1.368, -0.34], 0.012, iron, group);
    const hanger = new THREE.Group();
    group.add(hanger);
    const hangerTop = collarHeight + 0.015;
    const hangerWidth = i === 2 ? 0.42 : 0.54;
    rod([0, hangerTop, -0.12], [-hangerWidth, hangerTop - 0.23, -0.12], 0.011, nickel, hanger);
    rod([-hangerWidth, hangerTop - 0.23, -0.12], [hangerWidth, hangerTop - 0.23, -0.12], 0.011, nickel, hanger);
    rod([hangerWidth, hangerTop - 0.23, -0.12], [0, hangerTop, -0.12], 0.011, nickel, hanger);
    const hookCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, hangerTop, -0.12),
      new THREE.Vector3(0, hangerTop + 0.12, -0.12),
      new THREE.Vector3(0.015, railHeight + 0.025, -0.26),
      new THREE.Vector3(0.075, railHeight + 0.025, -0.34),
      new THREE.Vector3(0.075, railHeight - 0.03, -0.34),
    ]);
    hanger.add(new THREE.Mesh(own(new THREE.TubeGeometry(hookCurve, 20, 0.01, 8, false)), nickel));
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
    pieces.push({ group, mesh, hanger, phase: i * TAU / 3 });
  }

  function resize() {
    if (disposed) return;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width), height = Math.max(1, rect.height);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.position.set(0, compact ? 0.9 : 1.85, compact ? Math.max(6.6, 5.65 / camera.aspect) : Math.max(10.1, 7.2 / camera.aspect));
    camera.lookAt(0, compact ? 0.2 : -0.1, 0);
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
    for (const piece of pieces) {
      if (!compact) {
        const angle = currentAngle + piece.phase;
        const depthScale = 0.84 + (Math.cos(angle) + 1) * 0.08;
        piece.group.position.set(Math.sin(angle) * 2.75, -1.377 * (1 - depthScale), Math.cos(angle) * 1.55 - 0.55);
        piece.group.scale.setScalar(depthScale);
        piece.mesh.rotation.y = -installation.rotation.y + Math.sin(angle) * 0.13;
      }
      const sway = reducedMotion ? 0 : Math.sin(time * 0.6 + piece.phase) * 0.009;
      piece.mesh.rotation.z = sway;
      piece.hanger.rotation.z = sway;
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
