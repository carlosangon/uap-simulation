import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import CCapture from 'ccapture.js-npmfixed';
import { createTriangleSpheres, createOrbitingSpheres } from './geometry.js';

// Video recording settings
const RECORD_VIDEO = false; // Set to true to start recording
const VIDEO_DURATION = 15; // seconds
const VIDEO_FPS = 60; // frames per second for smooth playback
const VIDEO_WIDTH = 1920;
const VIDEO_HEIGHT = 1080;

// CCapture setup for high-quality video export
const capturer = new CCapture({
  format: 'webm',
  framerate: VIDEO_FPS,
  verbose: true,
  name: 'uap-simulation',
  quality: 100,
});

let isRecording = false;
let recordingStartTime = 0;
let frameCount = 0;
const totalFrames = VIDEO_DURATION * VIDEO_FPS;

// Scene setup
const scene = new THREE.Scene();

// Load sky texture on a flat plane background
const textureLoader = new THREE.TextureLoader();
textureLoader.load('/src/assets/background.jpg', (texture) => {
  // Create a large plane for the background
  const aspectRatio = texture.image.width / texture.image.height;
  const planeHeight = 300;
  const planeWidth = planeHeight * aspectRatio;

  const bgGeometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
  const bgMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.FrontSide,
    color: 0x444344, // Darken the texture for nighttime effect
  });

  const bgPlane = new THREE.Mesh(bgGeometry, bgMaterial);
  bgPlane.position.z = -100; // Position behind everything
  scene.add(bgPlane);
});

// Set a dark background color
scene.background = new THREE.Color(0x111111);

// Camera
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, -10, 40);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
const width = RECORD_VIDEO ? VIDEO_WIDTH : window.innerWidth;
const height = RECORD_VIDEO ? VIDEO_HEIGHT : window.innerHeight;
renderer.setSize(width, height);
renderer.setPixelRatio(RECORD_VIDEO ? 1 : window.devicePixelRatio);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);

// Update camera aspect for recording
if (RECORD_VIDEO) {
  camera.aspect = VIDEO_WIDTH / VIDEO_HEIGHT;
  camera.updateProjectionMatrix();
}

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// Post-processing for bloom/glow effect
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.50,   // strength
  2.0,   // radius
  0.95   // threshold
);
composer.addPass(bloomPass);

// Environment map for reflections (higher resolution for sharper reflections)
const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(512, {
  format: THREE.RGBAFormat,
  generateMipmaps: true,
  minFilter: THREE.LinearMipmapLinearFilter,
});
const cubeCamera = new THREE.CubeCamera(0.1, 100, cubeRenderTarget);
scene.add(cubeCamera);

// Lighting - multiple lights for chrome reflections
const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
scene.add(ambientLight);

// Main directional light
const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
directionalLight.position.set(10, 10, 10);
scene.add(directionalLight);

// Secondary lights for better reflections
const pointLight1 = new THREE.PointLight(0xffffff, 1.5, 50);
pointLight1.position.set(-8, 8, 5);
scene.add(pointLight1);

const pointLight2 = new THREE.PointLight(0x88aaff, 1, 50);
pointLight2.position.set(8, 5, -5);
scene.add(pointLight2);

const pointLight3 = new THREE.PointLight(0xffaa88, 0.8, 50);
pointLight3.position.set(0, -5, 10);
scene.add(pointLight3);


// Create the main triangle spheres
const { group: mainGroup, spheres: mainSpheres } = createTriangleSpheres();
scene.add(mainGroup);

// Create the orbiting spheres (no longer in a triangle group)
const { spheres: orbitSpheres } = createOrbitingSpheres();
// Add each orbiting sphere directly to mainGroup so they orbit the nucleus independently
orbitSpheres.forEach(sphere => mainGroup.add(sphere));

// Apply environment map to all spheres
[...mainSpheres, ...orbitSpheres].forEach(sphere => {
  sphere.material.envMap = cubeRenderTarget.texture;
});

// Movement parameters
const movementRange = 80; // How far left/right the group moves
const movementSpeed = 0.4; // Speed of left-right movement
const individualWobble = 0.15; // How much each sphere wobbles individually

// Orbit parameters - electron-like orbits
const orbitRadius = 3.5; // Distance from nucleus
const orbitSpeed = 1.5; // Base speed of orbit
// Each electron has different orbital plane (tilt angles) and speed
const electronOrbits = [
  { tiltX: 0, tiltZ: 0, speedMult: 1.0 },           // Horizontal orbit (equatorial)
  { tiltX: Math.PI / 3, tiltZ: 0, speedMult: 1.3 }, // Tilted 60 degrees
  { tiltX: Math.PI / 4, tiltZ: Math.PI / 3, speedMult: 0.8 }, // Tilted on both axes
];

// Start recording if enabled
function startRecording() {
  if (RECORD_VIDEO && !isRecording) {
    isRecording = true;
    recordingStartTime = performance.now();
    frameCount = 0;
    capturer.start();
    console.log('Recording started...');
  }
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  // Use fixed time for recording (frame-perfect), real time otherwise
  let time;
  if (RECORD_VIDEO) {
    time = frameCount / VIDEO_FPS;
  } else {
    time = Date.now() * 0.001;
  }

  // Update environment map for reflections
  mainGroup.visible = false;
  cubeCamera.position.copy(mainGroup.position);
  cubeCamera.update(renderer, scene);
  mainGroup.visible = true;

  // Move the main group left to right (sinusoidal motion)
  mainGroup.position.x = Math.sin(time * movementSpeed) * movementRange;

  // Individual sphere wobble while maintaining triangle formation
  mainSpheres.forEach((sphere, i) => {
    const baseOffset = sphere.userData.baseOffset;
    const phase = i * (Math.PI * 2 / 3); // 120 degrees apart

    // Small individual oscillations
    sphere.position.x = baseOffset.x + Math.sin(time * 2 + phase) * individualWobble;
    sphere.position.y = baseOffset.y + Math.cos(time * 2.5 + phase) * individualWobble;
    sphere.position.z = baseOffset.z + Math.sin(time * 1.8 + phase) * individualWobble * 0.5;
  });

  // Slight rotation of the whole main formation
  mainGroup.rotation.z = Math.sin(time * 0.3) * 0.1;

  // Animate orbiting spheres like electrons around a nucleus
  orbitSpheres.forEach((sphere, i) => {
    const orbit = electronOrbits[i];
    const angle = time * orbitSpeed * orbit.speedMult + (i * Math.PI * 2 / 3); // Phase offset

    // Calculate position on a circular orbit
    let x = Math.cos(angle) * orbitRadius;
    let y = 0;
    let z = Math.sin(angle) * orbitRadius;

    // Apply orbital plane tilt (rotate the orbit in 3D space)
    // Rotate around X axis
    const cosX = Math.cos(orbit.tiltX);
    const sinX = Math.sin(orbit.tiltX);
    const y1 = y * cosX - z * sinX;
    const z1 = y * sinX + z * cosX;

    // Rotate around Z axis
    const cosZ = Math.cos(orbit.tiltZ);
    const sinZ = Math.sin(orbit.tiltZ);
    const x2 = x * cosZ - y1 * sinZ;
    const y2 = x * sinZ + y1 * cosZ;

    sphere.position.set(x2, y2, z1);
  });

  controls.update();
  composer.render();

  // Capture frame if recording
  if (RECORD_VIDEO && isRecording) {
    capturer.capture(renderer.domElement);
    frameCount++;

    // Show progress
    const progress = ((frameCount / totalFrames) * 100).toFixed(1);
    console.log(`Recording: ${progress}% (${frameCount}/${totalFrames} frames)`);

    // Stop recording after duration
    if (frameCount >= totalFrames) {
      isRecording = false;
      capturer.stop();
      capturer.save();
      console.log('Recording complete! File will download automatically.');
    }
  }
}

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// Start animation
animate();

// Auto-start recording after a short delay (let scene initialize)
if (RECORD_VIDEO) {
  setTimeout(() => {
    startRecording();
  }, 500);
}

// Also allow manual start with 'R' key
window.addEventListener('keydown', (e) => {
  if (e.key === 'r' || e.key === 'R') {
    startRecording();
  }
});
