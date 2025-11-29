import * as THREE from 'three';

/**
 * Create 3 chrome spheres in a triangle formation.
 */
export function createTriangleSpheres() {
  const spheres = [];

  // Bright reflective glow material
  const chromeMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 1.0,
    roughness: 0.05,
    envMapIntensity: 2.0,
    emissive: 0xaaddff,
    emissiveIntensity: 0.8,
  });

  const sphereRadius = 0.05;
  const sphereGeometry = new THREE.SphereGeometry(sphereRadius, 64, 64);

  // Triangle formation offsets (equilateral triangle)
  const triangleSize = 2.0;
  const positions = [
    { x: 0, y: triangleSize * 0.577, z: 0 },                    // Top
    { x: -triangleSize / 2, y: -triangleSize * 0.289, z: 0 },   // Bottom left
    { x: triangleSize / 2, y: -triangleSize * 0.289, z: 0 },    // Bottom right
  ];

  positions.forEach((pos, index) => {
    const sphere = new THREE.Mesh(sphereGeometry, chromeMaterial.clone());
    sphere.position.set(pos.x, pos.y, pos.z);
    sphere.userData = {
      index,
      baseOffset: { x: pos.x, y: pos.y, z: pos.z },
    };
    spheres.push(sphere);
  });

  // Group the spheres together for coordinated movement
  const group = new THREE.Group();
  spheres.forEach(sphere => group.add(sphere));
  group.position.y = 2; // Lift above the grid

  return { group, spheres };
}

/**
 * Create 3 smaller orbiting spheres in a triangle formation.
 */
export function createOrbitingSpheres() {
  const spheres = [];

  // Bright reflective glow material for orbiting spheres
  const chromeMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 1.0,
    roughness: 0.05,
    envMapIntensity: 2.0,
    emissive: 0x99ccff,
    emissiveIntensity: 0.7,
  });

  const sphereRadius = 0.05; // Smaller than main spheres
  const sphereGeometry = new THREE.SphereGeometry(sphereRadius, 64, 64);

  // Triangle formation offsets (more spaced out)
  const triangleSize = 1.0;
  const positions = [
    { x: 0, y: triangleSize * 0.577, z: 0 },                    // Top
    { x: -triangleSize / 2, y: -triangleSize * 0.289, z: 0 },   // Bottom left
    { x: triangleSize / 2, y: -triangleSize * 0.289, z: 0 },    // Bottom right
  ];

  positions.forEach((pos, index) => {
    const sphere = new THREE.Mesh(sphereGeometry, chromeMaterial.clone());
    sphere.position.set(pos.x, pos.y, pos.z);
    sphere.userData = {
      index,
      baseOffset: { x: pos.x, y: pos.y, z: pos.z },
    };
    spheres.push(sphere);
  });

  // Group the orbiting spheres
  const group = new THREE.Group();
  spheres.forEach(sphere => group.add(sphere));

  return { group, spheres };
}
