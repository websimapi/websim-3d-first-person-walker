import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';
import { PointerLockControls } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/controls/PointerLockControls.js';

const vertexShader = `
  varying vec2 vUv;
  
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform float time;
  uniform float pixelSize;
  uniform bool isAnimated;
  varying vec2 vUv;

  // Pseudo-random function
  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
  }

  void main() {
    // Create pixelated coordinates
    vec2 pixelatedUv = floor(vUv * 64.0) / 64.0;
    
    float r;
    if (isAnimated) {
      // For animated objects, use time-based noise
      r = random(pixelatedUv + vec2(time * 0.1));
    } else {
      // For static objects, use position-based noise
      r = random(pixelatedUv);
    }
    
    // Convert to black and white
    vec3 color = vec3(step(0.5, r));
    
    gl_FragColor = vec4(color, 1.0);
  }
`;

class Game {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      preserveDrawingBuffer: true
    });
    
    this.renderer.setPixelRatio(1);
    this.renderer.outputEncoding = THREE.LinearEncoding;

    this.clock = new THREE.Clock();
    this.setupBasics();
    this.setupObjects();
    this.animate();
  }

  setupBasics() {
    this.controls = null;
    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this.prevTime = performance.now();

    this.scene.background = new THREE.Color(0x000000);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);

    this.controls = new PointerLockControls(this.camera, document.body);

    document.addEventListener('click', () => this.controls.lock());
    document.addEventListener('keydown', (event) => this.onKeyDown(event));
    document.addEventListener('keyup', (event) => this.onKeyUp(event));
    window.addEventListener('resize', () => this.handleResize());
  }

  setupObjects() {
    const light = new THREE.AmbientLight(0xffffff, 1);
    this.scene.add(light);
    
    // Create shader materials
    const animatedMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        time: { value: 0 },
        pixelSize: { value: 2.0 },
        isAnimated: { value: true }
      }
    });

    // Create cubes with animated shader material
    for (let i = 0; i < 10; i++) {
      const size = 3;
      const geometry = new THREE.BoxGeometry(size, size, size);
      const cube = new THREE.Mesh(geometry, animatedMaterial.clone());
      
      cube.position.x = Math.random() * 40 - 20;
      cube.position.y = Math.random() * 40 - 20;
      cube.position.z = Math.random() * 40 - 20;
      this.scene.add(cube);
    }

    this.camera.position.set(0, 0, 10);
  }

  handleResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
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

    const speed = 15.0;
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

  updateShaderUniforms() {
    const time = this.clock.getElapsedTime();
    this.scene.traverse((object) => {
      if (object.isMesh && object.material.type === 'ShaderMaterial') {
        object.material.uniforms.time.value = time;
      }
    });
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    
    if (this.controls.isLocked) {
      this.updateMovement();
    }
    
    this.updateShaderUniforms();
    this.renderer.render(this.scene, this.camera);
  }
}

new Game();