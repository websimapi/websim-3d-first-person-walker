import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';
import { PointerLockControls } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/controls/PointerLockControls.js';

class Game {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer();
    this.controls = null;
    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this.prevTime = performance.now();

    this.init();
    this.setupWorld();
    this.animate();
  }

  init() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);

    this.controls = new PointerLockControls(this.camera, document.body);

    document.addEventListener('click', () => {
      this.controls.lock();
    });

    document.addEventListener('keydown', (event) => this.onKeyDown(event));
    document.addEventListener('keyup', (event) => this.onKeyUp(event));

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  setupWorld() {
    // Add lights
    const ambientLight = new THREE.AmbientLight(0x404040);
    this.scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1);
    this.scene.add(directionalLight);

    // Create floor
    const floorGeometry = new THREE.PlaneGeometry(20, 20);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x808080,
      roughness: 0.8,
      metalness: 0.2
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);

    // Add some random cubes
    for (let i = 0; i < 20; i++) {
      const geometry = new THREE.BoxGeometry();
      const material = new THREE.MeshStandardMaterial({ 
        color: Math.random() * 0xffffff,
        roughness: 0.7,
        metalness: 0.3
      });
      const cube = new THREE.Mesh(geometry, material);
      cube.position.x = Math.random() * 16 - 8;
      cube.position.y = 0.5;
      cube.position.z = Math.random() * 16 - 8;
      this.scene.add(cube);
    }

    // Set initial camera position
    this.camera.position.y = 1.6; // Average human height
  }

  onKeyDown(event) {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.moveForward = true;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.moveBackward = true;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        this.moveLeft = true;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.moveRight = true;
        break;
    }
  }

  onKeyUp(event) {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.moveForward = false;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.moveBackward = false;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        this.moveLeft = false;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.moveRight = false;
        break;
    }
  }

  updateMovement() {
    const time = performance.now();
    const delta = (time - this.prevTime) / 1000;

    this.velocity.x -= this.velocity.x * 10.0 * delta;
    this.velocity.z -= this.velocity.z * 10.0 * delta;

    this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
    this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
    this.direction.normalize();

    const speed = 5.0;
    if (this.moveForward || this.moveBackward) {
      this.velocity.z -= this.direction.z * speed * delta;
    }
    if (this.moveLeft || this.moveRight) {
      this.velocity.x -= this.direction.x * speed * delta;
    }

    this.controls.moveRight(-this.velocity.x * delta);
    this.controls.moveForward(-this.velocity.z * delta);

    this.prevTime = time;
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    
    if (this.controls.isLocked) {
      this.updateMovement();
    }
    
    this.renderer.render(this.scene, this.camera);
  }
}

// Start the game
new Game();