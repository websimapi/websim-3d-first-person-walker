import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';
import { PointerLockControls } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/controls/PointerLockControls.js';

class Game {
  constructor() {
    this.PIXEL_SIZE = 2; 
    this.TEXTURE_SIZE = 128; 
    this.ROOM_SIZE = 20;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      preserveDrawingBuffer: true
    });
    
    this.renderer.setPixelRatio(1);
    this.renderer.outputEncoding = THREE.LinearEncoding;

    this.setupBasics();
    this.setupRoom();
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
    this.noiseTextures = [];
    this.lastPosition = new THREE.Vector3();
    this.lastRotation = new THREE.Euler();
    this.needsTextureUpdate = false;

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);

    this.controls = new PointerLockControls(this.camera, document.body);

    document.addEventListener('click', () => this.controls.lock());
    document.addEventListener('keydown', (event) => this.onKeyDown(event));
    document.addEventListener('keyup', (event) => this.onKeyUp(event));
    window.addEventListener('resize', () => this.handleResize());
  }

  createNoiseTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = this.TEXTURE_SIZE;
    canvas.height = this.TEXTURE_SIZE;
    const context = canvas.getContext('2d', { alpha: false });
    context.imageSmoothingEnabled = false;
    
    const imageData = context.createImageData(this.TEXTURE_SIZE, this.TEXTURE_SIZE);
    const data = imageData.data;

    for (let y = 0; y < this.TEXTURE_SIZE; y += this.PIXEL_SIZE) {
      for (let x = 0; x < this.TEXTURE_SIZE; x += this.PIXEL_SIZE) {
        const value = Math.random() < 0.5 ? 0 : 255;
        for (let py = 0; py < this.PIXEL_SIZE && (y + py) < this.TEXTURE_SIZE; py++) {
          for (let px = 0; px < this.PIXEL_SIZE && (x + px) < this.TEXTURE_SIZE; px++) {
            const idx = ((y + py) * this.TEXTURE_SIZE + (x + px)) * 4;
            data[idx] = data[idx + 1] = data[idx + 2] = value;
            data[idx + 3] = 255;
          }
        }
      }
    }

    context.putImageData(imageData, 0, 0);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.canvas = canvas;
    
    return texture;
  }

  updateNoiseTexture(texture) {
    const context = texture.canvas.getContext('2d', { alpha: false });
    const imageData = context.createImageData(this.TEXTURE_SIZE, this.TEXTURE_SIZE);
    const data = imageData.data;

    for (let y = 0; y < this.TEXTURE_SIZE; y += this.PIXEL_SIZE) {
      for (let x = 0; x < this.TEXTURE_SIZE; x += this.PIXEL_SIZE) {
        const value = Math.random() < 0.5 ? 0 : 255;
        for (let py = 0; py < this.PIXEL_SIZE && (y + py) < this.TEXTURE_SIZE; py++) {
          for (let px = 0; px < this.PIXEL_SIZE && (x + px) < this.TEXTURE_SIZE; px++) {
            const idx = ((y + py) * this.TEXTURE_SIZE + (x + px)) * 4;
            data[idx] = data[idx + 1] = data[idx + 2] = value;
            data[idx + 3] = 255;
          }
        }
      }
    }

    context.putImageData(imageData, 0, 0);
    texture.needsUpdate = true;
  }

  setupRoom() {
    const size = this.ROOM_SIZE;
    const geometry = new THREE.BoxGeometry(size, size, size);
    geometry.scale(1, 1, 1); 
    
    const materials = [];
    for (let i = 0; i < 6; i++) {
      const texture = this.createNoiseTexture();
      this.noiseTextures.push(texture);
      materials.push(new THREE.MeshStandardMaterial({
        map: texture,
        side: THREE.BackSide,
        roughness: 0.9,
        metalness: 0.1
      }));
    }

    const room = new THREE.Mesh(geometry, materials);
    this.scene.add(room);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1);
    this.scene.add(directionalLight);

    this.camera.position.set(0, 0, 0);
    this.lastPosition.copy(this.camera.position);
    this.lastRotation.copy(this.camera.rotation);
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
    
    for (const texture of this.noiseTextures) {
      this.updateNoiseTexture(texture);
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