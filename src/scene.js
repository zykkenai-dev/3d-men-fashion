import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// Bespoke procedural garments. Every panel is an actual draped mesh, with
// physical leather, connected sleeves, a hollow neckline and sewn detailing.
const TAU = Math.PI * 2;
const clamp = THREE.MathUtils.clamp;
const mix = THREE.MathUtils.lerp;
const smooth = (a, b, t) => {
  const k = clamp((t - a) / (b - a), 0, 1);
  return k * k * (3 - 2 * k);
};

function profile(t, values) {
  for (let i = 1; i < values.length; i++) {
    if (t <= values[i][0]) {
      const [a, av] = values[i - 1];
      const [b, bv] = values[i];
      return mix(av, bv, smooth(a, b, t));
    }
  }
  return values.at(-1)[1];
}

function surface(uSteps, vSteps, point, wrap = false) {
  const position = [], uv = [], index = [];
  for (let v = 0; v <= vSteps; v++) {
    for (let u = 0; u <= uSteps; u++) {
      const p = point(u / uSteps, v / vSteps);
      position.push(p.x, p.y, p.z);
      uv.push(u / uSteps, v / vSteps);
    }
  }
  for (let v = 0; v < vSteps; v++) {
    for (let u = 0; u < uSteps; u++) {
      const a = v * (uSteps + 1) + u;
      const b = a + uSteps + 1;
      index.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

function grainTexture(kind) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const context = canvas.getContext('2d');
  const pixels = context.createImageData(512, 512);
  let seed = 1932;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let y = 0; y < 512; y++) {
    for (let x = 0; x < 512; x++) {
      const i = (y * 512 + x) * 4;
      const leather = random() * 55 + 112 + Math.sin(x * 0.16 + Math.sin(y * 0.09)) * 9;
      const knit = 124 + Math.sin(x * 1.58 + Math.sin(y * 0.77) * 0.95) * 45 + Math.sin(y * 1.56) * 21;
      const value = kind === 'knit' ? knit : leather;
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = value;
      pixels.data[i + 3] = 255;
    }
  }
  context.putImageData(pixels, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(kind === 'knit' ? 4 : 3, kind === 'knit' ? 4 : 3);
  return texture;
}

function tube(points, radius, material, parent, steps = 70) {
  const curve = points instanceof THREE.Curve ? points : new THREE.CatmullRomCurve3(points);
  const geometry = new THREE.TubeGeometry(curve, steps, radius, 6, false);
  const mesh = new THREE.Mesh(geometry, material);
  parent.add(mesh);
  return mesh;
}

function stitched(points, parent, material, spacing = 0.026) {
  const curve = points instanceof THREE.Curve ? points : new THREE.CatmullRomCurve3(points);
  const length = curve.getLength();
  const count = Math.floor(length / spacing);
  const geometry = new THREE.CylinderGeometry(0.0018, 0.0018, spacing * 0.44, 4);
  const stitches = new THREE.InstancedMesh(geometry, material, count);
  const dummy = new THREE.Object3D();
  const axis = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    dummy.position.copy(curve.getPointAt(t));
    dummy.quaternion.setFromUnitVectors(axis, curve.getTangentAt(t).normalize());
    dummy.updateMatrix();
    stitches.setMatrixAt(i, dummy.matrix);
  }
  stitches.instanceMatrix.needsUpdate = true;
  parent.add(stitches);
}

function torsoPoint(theta, t, kind = 'jacket') {
  const width = profile(t, [[0, 0.68], [0.10, 0.71], [0.35, 0.71], [0.68, 0.79], [0.83, 0.79], [0.92, 0.69], [1, 0.295]]);
  const depth = profile(t, [[0, 0.265], [0.26, 0.292], [0.65, 0.315], [0.86, 0.29], [1, 0.215]]);
  const x = Math.sin(theta) * width;
  const front = Math.max(0, Math.cos(theta));
  const edge = Math.pow(Math.abs(Math.sin(theta)), 4);
  const low = Math.exp(-Math.pow((t - 0.15) * 8, 2));
  const shoulder = Math.exp(-Math.pow((t - 0.78) * 12, 2));
  let folds = Math.sin(t * 38 + theta * 6) * 0.011 * edge;
  folds += Math.sin(t * 24 + Math.abs(x) * 11) * 0.009 * low;
  folds += Math.sin(t * 34 + theta * 5) * 0.016 * shoulder * edge;
  folds += Math.sin(theta * 10 + 0.5) * 0.007 * low;
  const centerCrease = Math.exp(-Math.pow(x * 4, 2)) * Math.sin(t * 13) * 0.008;
  const z = Math.cos(theta) * (depth + folds) + front * centerCrease;
  const y = -1.075 + t * 2.315 + Math.sin(theta * 5) * 0.008 * (1 - smooth(0.1, 0.3, t));
  return new THREE.Vector3(x, y, z);
}

function frontDepth(y) {
  return torsoPoint(0, clamp((y + 1.075) / 2.315, 0, 1)).z;
}

function createJacket(materials, kind = 'jacket') {
  const group = new THREE.Group();
  const leather = materials.main;
  const detail = materials.detail;
  const thread = materials.thread;
  const jacket = kind === 'jacket';
  // A minute front split gives the zipper real depth rather than a painted line.
  const body = surface(100, 74, (u, v) => {
    const opening = jacket ? (0.018 + smooth(0.85, 1, v) * 0.13) : 0;
    return torsoPoint(opening + u * (TAU - 2 * opening), v, kind);
  });
  group.add(new THREE.Mesh(body, leather));

  // Interior upper shell stays visible inside the open neck.
  const lining = surface(72, 14, (u, v) => {
    const theta = u * TAU;
    return new THREE.Vector3(Math.sin(theta) * (0.28 + (1 - v) * 0.035), 1.04 + v * 0.205, Math.cos(theta) * 0.205);
  });
  group.add(new THREE.Mesh(lining, materials.lining));

  const hem = Array.from({ length: 100 }, (_, i) => torsoPoint(i / 99 * TAU, 0.022));
  tube(hem, jacket ? 0.018 : 0.048, detail, group, 110);
  if (jacket) {
    stitched(hem.map(p => p.clone().add(new THREE.Vector3(0, 0.022, 0))), group, thread);
    stitched(hem.map(p => p.clone().add(new THREE.Vector3(0, -0.012, 0))), group, thread);
  }

  // Swept tubes are shaped to the arm, with pinched leather around the elbows.
  for (const sign of [-1, 1]) {
    const axis = new THREE.CatmullRomCurve3([
      new THREE.Vector3(sign * 0.45, 0.88, -0.025),
      new THREE.Vector3(sign * 0.78, 0.77, -0.005),
      new THREE.Vector3(sign * 0.91, 0.57, 0.025),
      new THREE.Vector3(sign * 1.02, 0.02, 0.045),
      new THREE.Vector3(sign * 1.105, -0.55, 0.095),
      new THREE.Vector3(sign * 1.13, -1.01, 0.15),
    ]);
    const sleevePoint = (u, v, offset = 0) => {
      const theta = u * TAU;
      const center = axis.getPoint(v);
      const tangent = axis.getTangent(v).normalize();
      const side = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 0, 1)).normalize();
      const face = new THREE.Vector3().crossVectors(side, tangent).normalize();
      const radius = profile(v, [[0, 0.20], [0.13, 0.268], [0.28, 0.255], [0.49, 0.222], [0.72, 0.20], [1, 0.158]]);
      const elbow = Math.exp(-Math.pow((v - 0.52) * 11, 2));
      const cuff = Math.exp(-Math.pow((v - 0.87) * 15, 2));
      const folds = Math.sin(v * 65 + Math.sin(theta * 3) * 2) * 0.016 * elbow
        + Math.sin(v * 72 + theta * 4) * 0.011 * cuff
        + Math.sin(v * 19 + theta * 4) * 0.006;
      return center.addScaledVector(side, Math.sin(theta) * (radius + folds + offset))
        .addScaledVector(face, Math.cos(theta) * (radius * 0.9 + folds + offset));
    };
    group.add(new THREE.Mesh(surface(62, 65, sleevePoint), leather));
    const armhole = Array.from({ length: 74 }, (_, i) => sleevePoint(i / 73, 0.17, 0.004));
    tube(armhole, 0.0035, detail, group, 80);
    if (jacket) stitched(armhole.map(p => p.clone().add(new THREE.Vector3(sign * 0.003, 0, 0.002))), group, thread);
    const sleeveSeam = Array.from({ length: 56 }, (_, i) => sleevePoint(sign > 0 ? 0.2 : 0.8, i / 55, 0.004));
    tube(sleeveSeam, 0.003, detail, group, 64);
    if (jacket) stitched(sleeveSeam, group, thread, 0.035);
    const cuffMesh = surface(64, 8, (u, v) => sleevePoint(u, 0.91 + v * 0.09, 0.006));
    group.add(new THREE.Mesh(cuffMesh, detail));
    const cuffLine = Array.from({ length: 65 }, (_, i) => sleevePoint(i / 64, 0.921, 0.010));
    tube(cuffLine, 0.004, detail, group);
    if (jacket) stitched(cuffLine, group, thread);
    const bottomLine = Array.from({ length: 65 }, (_, i) => sleevePoint(i / 64, 1, 0.007));
    tube(bottomLine, 0.012, detail, group);
    const cuffInterior = surface(48, 5, (u, v) => sleevePoint(u, 0.95 + v * 0.05, -0.009));
    group.add(new THREE.Mesh(cuffInterior, materials.lining));
  }

  if (!jacket) {
    // A sculpted ribbed crew neck is built around the open neckline.
    const collar = surface(100, 16, (u, v) => {
      const theta = u * TAU;
      const radius = 0.30 + Math.sin(v * Math.PI) * 0.028;
      return new THREE.Vector3(Math.sin(theta) * radius, 1.20 + v * 0.10, Math.cos(theta) * 0.22);
    });
    group.add(new THREE.Mesh(collar, detail));
    for (let i = 0; i < 86; i++) {
      const theta = i / 86 * TAU;
      tube([new THREE.Vector3(Math.sin(theta) * 0.306, 1.21, Math.cos(theta) * 0.226), new THREE.Vector3(Math.sin(theta) * 0.313, 1.25, Math.cos(theta) * 0.23), new THREE.Vector3(Math.sin(theta) * 0.303, 1.30, Math.cos(theta) * 0.224)], 0.0024, thread, group, 5);
    }
    return group;
  }

  // Folded turn-down collar panels, a curved two-sided leather patch.
  for (const sign of [-1, 1]) {
    const collarPoint = (u, v) => {
      const top = new THREE.Vector3(sign * mix(0.055, 0.305, u), mix(1.15, 1.315, u), mix(0.265, 0.025, u));
      const bottom = new THREE.Vector3(sign * mix(0.24, 0.505, u), mix(0.88, 1.12, u), mix(0.402, 0.225, u));
      const p = top.lerp(bottom, v);
      p.z += Math.sin(u * Math.PI) * Math.sin(v * Math.PI) * 0.041;
      return p;
    };
    group.add(new THREE.Mesh(surface(28, 24, collarPoint), detail));
    const collarEdge = [
      ...Array.from({ length: 25 }, (_, i) => collarPoint(i / 24, 1)),
      ...Array.from({ length: 25 }, (_, i) => collarPoint(1, 1 - i / 24)),
    ];
    tube(collarEdge, 0.007, detail, group, 60);
    stitched(collarEdge.map(p => p.clone().add(new THREE.Vector3(-sign * 0.01, 0.016, 0.005))), group, thread, 0.027);
  }
  const collarBack = surface(64, 10, (u, v) => {
    const theta = Math.PI / 2 + u * Math.PI;
    return new THREE.Vector3(Math.sin(theta) * (0.301 + v * 0.025), 1.235 + v * 0.085, Math.cos(theta) * (0.213 + v * 0.011));
  });
  group.add(new THREE.Mesh(collarBack, detail));

  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 512;
  labelCanvas.height = 128;
  const labelContext = labelCanvas.getContext('2d');
  labelContext.fillStyle = '#29221b';
  labelContext.fillRect(0, 0, 512, 128);
  labelContext.fillStyle = '#d1b78e';
  labelContext.font = '46px Georgia';
  labelContext.textAlign = 'center';
  labelContext.fillText('A E T H E L', 256, 73);
  const labelTexture = new THREE.CanvasTexture(labelCanvas);
  labelTexture.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Mesh(new THREE.PlaneGeometry(0.175, 0.044), new THREE.MeshBasicMaterial({ map: labelTexture, side: THREE.DoubleSide }));
  label.position.set(0, 1.185, -0.188);
  group.add(label);

  const backYoke = Array.from({ length: 72 }, (_, i) => {
    const theta = Math.PI / 2 + i / 71 * Math.PI;
    const p = torsoPoint(theta, 0.82);
    p.z -= 0.004;
    return p;
  });
  tube(backYoke, 0.0035, detail, group, 76);
  stitched(backYoke.map(p => p.clone().add(new THREE.Vector3(0, 0.017, -0.001))), group, thread, 0.031);

  // Zip tape, individual brass teeth and the weighted pull tab.
  for (const sign of [-1, 1]) {
    const zipTape = Array.from({ length: 50 }, (_, i) => {
      const y = mix(-1.045, 0.945, i / 49);
      return new THREE.Vector3(sign * 0.026, y, frontDepth(y) + 0.008);
    });
    tube(zipTape, 0.015, materials.zipperTape, group);
    stitched(zipTape.map(p => p.clone().add(new THREE.Vector3(sign * 0.025, 0, 0.004))), group, thread, 0.027);
  }
  const teethCount = 148;
  const teeth = new THREE.InstancedMesh(new THREE.BoxGeometry(0.019, 0.013, 0.017), materials.metal, teethCount);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < teethCount; i++) {
    const y = -1.025 + Math.floor(i / 2) * 0.026;
    dummy.position.set(i % 2 ? -0.009 : 0.009, y + (i % 2) * 0.009, frontDepth(y) + 0.017);
    dummy.rotation.z = i % 2 ? -0.07 : 0.07;
    dummy.updateMatrix();
    teeth.setMatrixAt(i, dummy.matrix);
  }
  group.add(teeth);
  const slider = new THREE.Mesh(new THREE.BoxGeometry(0.047, 0.074, 0.035), materials.metal);
  slider.position.set(0, 0.882, frontDepth(0.882) + 0.033);
  group.add(slider);
  const pull = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.006, 8, 24), materials.metal);
  pull.scale.set(0.63, 1.65, 1);
  pull.position.set(0, 0.827, frontDepth(0.827) + 0.050);
  pull.rotation.x = 0.23;
  group.add(pull);

  // Welt pockets follow the curved torso rather than hovering above it.
  for (const sign of [-1, 1]) {
    const pocketPoint = (u, v) => {
      const x = sign * (0.31 + u * 0.245 + v * 0.028);
      const y = -0.14 - u * 0.43 + v * 0.045;
      const t = (y + 1.075) / 2.315;
      const w = profile(t, [[0, 0.68], [0.35, 0.71], [0.68, 0.79], [1, 0.295]]);
      const theta = Math.asin(clamp(x / w, -0.99, 0.99));
      const p = torsoPoint(theta, t);
      p.x = x;
      p.y = y;
      p.z += 0.014 + Math.sin(v * Math.PI) * 0.008;
      return p;
    };
    group.add(new THREE.Mesh(surface(30, 6, pocketPoint), detail));
    const edge = Array.from({ length: 32 }, (_, i) => pocketPoint(i / 31, 0.03));
    tube(edge, 0.0065, materials.zipperTape, group, 36);
    const top = Array.from({ length: 32 }, (_, i) => pocketPoint(i / 31, 0.88));
    stitched(top, group, thread, 0.025);
    // Tailoring seam from shoulder through the torso.
    const panel = Array.from({ length: 70 }, (_, i) => torsoPoint(sign * (0.58 + i / 69 * 0.06), 0.07 + i / 69 * 0.80));
    tube(panel, 0.0028, detail, group, 75);
    stitched(panel.map(p => p.clone().add(new THREE.Vector3(sign * 0.007, 0, 0.003))), group, thread, 0.034);
  }
  return group;
}

function createTrousers(materials) {
  const group = new THREE.Group();
  const hips = surface(80, 26, (u, v) => {
    const theta = u * TAU;
    return new THREE.Vector3(Math.sin(theta) * mix(0.48, 0.53, v), 0.55 + v * 0.69, Math.cos(theta) * mix(0.215, 0.22, v));
  });
  group.add(new THREE.Mesh(hips, materials.main));
  for (const sign of [-1, 1]) {
    const leg = (u, v, extra = 0) => {
      const angle = u * TAU;
      const rx = profile(v, [[0, 0.272], [0.24, 0.255], [0.52, 0.215], [0.78, 0.17], [1, 0.154]]);
      const rz = profile(v, [[0, 0.225], [0.50, 0.18], [1, 0.135]]);
      const fold = Math.sin(v * 39 + angle * 3) * 0.009 * Math.exp(-Math.pow((v - 0.56) * 12, 2));
      const crease = Math.pow(Math.max(0, Math.cos(angle)), 12) * 0.015;
      return new THREE.Vector3(sign * (0.272 + v * 0.025) + Math.sin(angle) * (rx + fold + extra), 0.75 - v * 2.04, Math.cos(angle) * (rz + fold + extra + crease));
    };
    group.add(new THREE.Mesh(surface(64, 66, leg), materials.main));
    const side = Array.from({ length: 55 }, (_, i) => leg(sign > 0 ? 0.25 : 0.75, i / 54, 0.003));
    tube(side, 0.003, materials.detail, group);
    const cuff = Array.from({ length: 65 }, (_, i) => leg(i / 64, 0.986, 0.002));
    tube(cuff, 0.011, materials.detail, group);
    const crease = Array.from({ length: 55 }, (_, i) => leg(0, 0.10 + i / 54 * 0.85, 0.002));
    tube(crease, 0.002, materials.detail, group);
    const pocket = [new THREE.Vector3(sign * 0.37, 1.16, 0.158), new THREE.Vector3(sign * 0.46, 0.96, 0.11), new THREE.Vector3(sign * 0.51, 0.78, 0.055)];
    tube(pocket, 0.0065, materials.detail, group, 35);
    stitched(pocket, group, materials.thread);
  }
  const waist = surface(80, 8, (u, v) => {
    const theta = u * TAU;
    return new THREE.Vector3(Math.sin(theta) * 0.533, 1.15 + v * 0.12, Math.cos(theta) * 0.227);
  });
  group.add(new THREE.Mesh(waist, materials.detail));
  const button = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.012, 20), materials.metal);
  button.rotation.x = Math.PI / 2;
  button.position.set(0.018, 1.20, 0.237);
  group.add(button);
  const fly = [new THREE.Vector3(0.043, 1.16, 0.234), new THREE.Vector3(0.05, 0.97, 0.236), new THREE.Vector3(0.018, 0.75, 0.223)];
  tube(fly, 0.003, materials.detail, group);
  return group;
}

/**
 * createFashionScene(canvas, { type, interactive, onReady })
 * Returns setColor(hex), setScroll(0..1), reset(), setActive(bool), dispose().
 * Scenes own their observers, GPU resources and animation frame handles.
 */
export function createFashionScene(canvas, { type = 'jacket', interactive = true, scale = interactive ? 0.94 : 1, onReady = () => {} } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: interactive ? 'high-performance' : 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, interactive ? 2 : 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.98;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  camera.position.set(0, 0.12, 5.8);
  camera.lookAt(0, 0.07, 0);
  const environment = new RoomEnvironment();
  const generator = new THREE.PMREMGenerator(renderer);
  const environmentTarget = generator.fromScene(environment, 0.04, 0.1, 100, { size: interactive ? 128 : 32 });
  scene.environment = environmentTarget.texture;
  scene.environmentIntensity = 0.65;
  environment.dispose();
  generator.dispose();

  scene.add(new THREE.HemisphereLight(0xfff5e6, 0x6d6252, 0.60));
  const key = new THREE.DirectionalLight(0xffedda, 1.9);
  key.position.set(-3, 5, 5);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xe2ecff, 0.70);
  fill.position.set(4, 1, 3);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xfff5e4, 2.4);
  rim.position.set(3, 3, -4);
  scene.add(rim);

  const knit = type === 'knit';
  const trousers = type === 'trousers';
  const grain = grainTexture(knit || trousers ? 'knit' : 'jacket');
  grain.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
  const initialColor = knit ? '#b5a887' : trousers ? '#47473d' : '#5f371f';
  const main = new THREE.MeshPhysicalMaterial({
    color: initialColor, roughness: knit || trousers ? 0.89 : 0.62,
    metalness: 0, bumpMap: grain, bumpScale: knit ? 0.009 : trousers ? 0.004 : 0.006,
    clearcoat: knit || trousers ? 0 : 0.04, clearcoatRoughness: 0.65,
    sheen: knit || trousers ? 0.8 : 0.07, sheenRoughness: 0.9,
    sheenColor: knit ? new THREE.Color('#eee5d2') : new THREE.Color('#b89269'),
    side: THREE.DoubleSide, envMapIntensity: 0.7,
  });
  const detail = main.clone();
  detail.color.multiplyScalar(knit ? 0.94 : 0.86);
  const thread = new THREE.MeshStandardMaterial({ color: knit ? '#a79b7e' : trousers ? '#55544a' : '#a27b58', roughness: 0.93 });
  const materials = {
    main, detail, thread,
    lining: new THREE.MeshStandardMaterial({ color: knit ? '#625b49' : '#27221c', roughness: 0.9, side: THREE.DoubleSide }),
    zipperTape: new THREE.MeshStandardMaterial({ color: '#583c29', roughness: 0.92 }),
    metal: new THREE.MeshStandardMaterial({ color: '#b9a27c', metalness: 0.82, roughness: 0.28 }),
  };
  const garment = trousers ? createTrousers(materials) : createJacket(materials, type);
  garment.scale.setScalar(scale);
  garment.rotation.set(-0.025, 0.22, -0.035);
  scene.add(garment);

  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 128;
  const shadowContext = shadowCanvas.getContext('2d');
  const gradient = shadowContext.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(57, 42, 24, 0.25)');
  gradient.addColorStop(0.4, 'rgba(57, 42, 24, 0.12)');
  gradient.addColorStop(1, 'rgba(57, 42, 24, 0)');
  shadowContext.fillStyle = gradient;
  shadowContext.fillRect(0, 0, 128, 128);
  const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 1.1), new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false, opacity: 0.75 }));
  shadow.position.set(0, -1.48, -0.13);
  shadow.rotation.x = -Math.PI / 2;
  scene.add(shadow);

  let width = 1, height = 1, frame = 0, active = true, disposed = false, ready = false;
  let dragging = false, pointerX = 0, pointerY = 0, startX = 0, startRotation = 0;
  let dragRotation = 0, currentRotation = 0.22, scroll = 0;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const startTime = performance.now();
  const resize = () => {
    const bounds = canvas.getBoundingClientRect();
    width = Math.max(1, bounds.width);
    height = Math.max(1, bounds.height);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // Width-aware framing keeps both cuffs in view on narrow screens.
    camera.position.z = Math.max(5.1, 4.95 / camera.aspect);
    camera.updateProjectionMatrix();
    render(performance.now());
  };

  function render(now) {
    if (disposed) return;
    const t = (now - startTime) / 1000;
    const float = reducedMotion ? 0 : Math.sin(t * 0.75) * 0.035;
    const desiredRotation = 0.22 + dragRotation + pointerX * 0.16 + scroll * 0.52;
    currentRotation = mix(currentRotation, desiredRotation, 0.075);
    garment.rotation.y = currentRotation;
    garment.rotation.x = -0.025 + pointerY * 0.045;
    garment.rotation.z = -0.035 + (reducedMotion ? 0 : Math.sin(t * 0.52) * 0.009);
    garment.position.y = float - scroll * 0.045;
    shadow.material.opacity = 0.72 - float * 1.1;
    renderer.render(scene, camera);
    if (!ready) {
      ready = true;
      requestAnimationFrame(() => { if (!disposed) onReady(); });
    }
  }
  const tick = (now) => {
    if (!active || disposed) { frame = 0; return; }
    render(now);
    frame = requestAnimationFrame(tick);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);

  const move = (event) => {
    if (dragging) {
      dragRotation = startRotation + (event.clientX - startX) * 0.009;
      return;
    }
    const bounds = canvas.getBoundingClientRect();
    pointerX = clamp((event.clientX - bounds.left) / width - 0.5, -0.5, 0.5);
    pointerY = clamp((event.clientY - bounds.top) / height - 0.5, -0.5, 0.5);
  };
  const down = (event) => {
    dragging = true;
    startX = event.clientX;
    startRotation = dragRotation;
    canvas.setPointerCapture(event.pointerId);
    canvas.style.cursor = 'grabbing';
  };
  const up = (event) => {
    dragging = false;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    canvas.style.cursor = 'grab';
  };
  const leave = () => { if (!dragging) { pointerX = 0; pointerY = 0; } };
  if (interactive) {
    canvas.style.touchAction = 'pan-y';
    canvas.style.cursor = 'grab';
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('pointerleave', leave);
  }
  resize();
  frame = requestAnimationFrame(tick);

  return {
    setColor(hex) {
      main.color.set(hex);
      detail.color.set(hex).multiplyScalar(knit ? 0.94 : 0.86);
      if (!active) render(performance.now());
    },
    setScroll(progress) { scroll = clamp(progress, 0, 1); if (!active) render(performance.now()); },
    reset() { dragRotation = 0; pointerX = 0; pointerY = 0; },
    setActive(value) {
      active = Boolean(value);
      if (active && !frame && !disposed) frame = requestAnimationFrame(tick);
      if (!active && frame) { cancelAnimationFrame(frame); frame = 0; }
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', up);
      canvas.removeEventListener('pointerleave', leave);
      const geometries = new Set();
      const materialSet = new Set();
      const textures = new Set();
      scene.traverse(object => {
        if (object.geometry) geometries.add(object.geometry);
        if (object.material) {
          for (const material of Array.isArray(object.material) ? object.material : [object.material]) materialSet.add(material);
        }
      });
      geometries.forEach(geometry => geometry.dispose());
      materialSet.forEach(material => {
        for (const key of ['map', 'bumpMap', 'normalMap', 'roughnessMap', 'metalnessMap']) {
          if (material[key]) textures.add(material[key]);
        }
        material.dispose();
      });
      textures.forEach(texture => texture.dispose());
      grain.dispose();
      shadowTexture.dispose();
      environmentTarget.dispose();
      renderer.dispose();
    },
  };
}
