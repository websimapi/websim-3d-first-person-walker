import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';
import { PointerLockControls } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/controls/PointerLockControls.js';

class Game {
  constructor() {
    // Base pixel size for consistent noise across all textures
    this.PIXEL_SIZE = 4;
    this.TEXTURE_SIZE = 64; // Base texture size that will be scaled

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      preserveDrawingBuffer: true
    });
    
    // Force pixel perfect rendering
    this.renderer.setPixelRatio(1);
    this.renderer.outputEncoding = THREE.LinearEncoding;

    this.controls = null;
    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this.prevTime = performance.now();
    this.objects = [];
    this.noiseCanvases = new Map();
    this.lastPosition = new THREE.Vector3();
    this.lastRotation = new THREE.Euler();
    this.needsTextureUpdate = false;

    this.init();
    this.setupWorld();
    this.animate();
  }

  createNoiseTexture(isStatic = false) {
    const canvas = document.createElement('canvas');
    canvas.width = this.TEXTURE_SIZE;
    canvas.height = this.TEXTURE_SIZE;
    const context = canvas.getContext('2d', { alpha: false });
    context.imageSmoothingEnabled = false;
    
    const imageData = context.createImageData(this.TEXTURE_SIZE, this.TEXTURE_SIZE);
    const data = imageData.data;

    // Generate noise at the pixel size level
    for (let y = 0; y < this.TEXTURE_SIZE; y += this.PIXEL_SIZE) {
      for (let x = 0; x < this.TEXTURE_SIZE; x += this.PIXEL_SIZE) {
        const value = Math.random() < 0.5 ? 0 : 255;
        // Fill the pixel block
        for (let py = 0; py < this.PIXEL_SIZE && (y + py) < this.TEXTURE_SIZE; py++) {
          for (let px = 0; px < this.PIXEL_SIZE && (x + px) < this.TEXTURE_SIZE; px++) {
            const idx = ((y + py) * this.TEXTURE_SIZE + (x + px)) * 4;
            data[idx] = value;     // R
            data[idx + 1] = value; // G
            data[idx + 2] = value; // B
            data[idx + 3] = 255;   // A
          }
        }
      }
    }

    context.putImageData(imageData, 0, 0);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    
    if (!isStatic) {
      this.noiseCanvases.set(texture, canvas);
    }
    
    return texture;
  }

  updateNoiseTexture(texture) {
    const canvas = this.noiseCanvases.get(texture);
    if (!canvas) return;
    
    const context = canvas.getContext('2d', { alpha: false });
    context.imageSmoothingEnabled = false;
    
    const imageData = context.createImageData(this.TEXTURE_SIZE, this.TEXTURE_SIZE);
    const data = imageData.data;

    // Update noise at the pixel size level
    for (let y = 0; y < this.TEXTURE_SIZE; y += this.PIXEL_SIZE) {
      for (let x = 0; x < this.TEXTURE_SIZE; x += this.PIXEL_SIZE) {
        const value = Math.random() < 0.5 ? 0 : 255;
        // Fill the pixel block
        for (let py = 0; py < this.PIXEL_SIZE && (y + py) < this.TEXTURE_SIZE; py++) {
          for (let px = 0; px < this.PIXEL_SIZE && (x + px) < this.TEXTURE_SIZE; px++) {
            const idx = ((y + py) * this.TEXTURE_SIZE + (x + px)) * 4;
            data[idx] = value;     // R
            data[idx + 1] = value; // G
            data[idx + 2] = value; // B
            data[idx + 3] = 255;   // A
          }
        }
      }
    }

    context.putImageData(imageData, 0, 0);
    texture.needsUpdate = true;
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
    // Create static background noise
    const bgNoiseTexture = this.createNoiseTexture(true);
    bgNoiseTexture.wrapS = THREE.RepeatWrapping;
    bgNoiseTexture.wrapT = THREE.RepeatWrapping;
    bgNoiseTexture.repeat.set(4, 4); // Adjust the repeat to match visual scale
    this.scene.background = bgNoiseTexture;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1);
    this.scene.add(directionalLight);

    for (let i = 0; i < 20; i++) {
      const geometry = new THREE.BoxGeometry();
      const noiseTexture = this.createNoiseTexture();
      const material = new THREE.MeshStandardMaterial({ 
        map: noiseTexture,
        roughness: 0.9,
        metalness: 0.1,
        envMapIntensity: 0.5
      });
      
      const cube = new THREE.Mesh(geometry, material);
      cube.position.x = Math.random() * 16 - 8;
      cube.position.y = 0.5;
      cube.position.z = Math.random() * 16 - 8;
      cube.rotation.y = Math.random() * Math.PI * 2;
      this.scene.add(cube);
      
      this.objects.push({
        mesh: cube,
        texture: noiseTexture
      });
    }

    this.camera.position.y = 1.6;
    this.lastPosition.copy(this.camera.position);
    this.lastRotation.copy(this.camera.rotation);
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

    if (!this.camera.position.equals(this.lastPosition) || 
        !this.camera.rotation.equals(this.lastRotation)) {
      this.needsTextureUpdate = true;
      this.lastPosition.copy(this.camera.position);
      this.lastRotation.copy(this.camera.rotation);
    }

    this.prevTime = time;
  }

  updateNoiseTextures() {
    if (!this.needsTextureUpdate) return;
    
    for (const obj of this.objects) {
      if (obj.texture) {
        this.updateNoiseTexture(obj.texture);
      }
    }
    
    this.needsTextureUpdate = false;
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    
    if (this.controls.isLocked) {
      this.updateMovement();
    }
    
    this.updateNoiseTextures();
    this.renderer.render(this.scene, this.camera);
  }
}

new Game();