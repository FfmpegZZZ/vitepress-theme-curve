<template>
  <div ref="containerRef" class="auth-background"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import * as THREE from 'three';

const containerRef = ref(null);
let scene, camera, renderer, particles, wave, animationId;
let mouseX = 0;
let mouseY = 0;

// 初始化场景
const initScene = () => {
  // 创建场景
  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x000000, 1, 1000);

  // 创建相机
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
  camera.position.z = 400;

  // 创建渲染器
  renderer = new THREE.WebGLRenderer({ 
    antialias: true, 
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  
  containerRef.value.appendChild(renderer.domElement);
};

// 创建粒子系统
const createParticles = () => {
  const isMobile = window.innerWidth < 768;
  const particleCount = isMobile ? 1000 : 3000;
  
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  
  // 颜色渐变 (深蓝到紫色到粉色)
  const color1 = new THREE.Color(0x4a90e2); // 蓝色
  const color2 = new THREE.Color(0x9b59b6); // 紫色
  const color3 = new THREE.Color(0xe74c3c); // 粉红色
  
  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;
    
    // 随机位置
    positions[i3] = (Math.random() - 0.5) * 1000;
    positions[i3 + 1] = (Math.random() - 0.5) * 1000;
    positions[i3 + 2] = (Math.random() - 0.5) * 1000;
    
    // 随机颜色混合
    const mixRatio1 = Math.random();
    const mixRatio2 = Math.random();
    const color = new THREE.Color();
    
    if (mixRatio1 < 0.33) {
      color.lerpColors(color1, color2, mixRatio2);
    } else if (mixRatio1 < 0.66) {
      color.lerpColors(color2, color3, mixRatio2);
    } else {
      color.lerpColors(color1, color3, mixRatio2);
    }
    
    colors[i3] = color.r;
    colors[i3 + 1] = color.g;
    colors[i3 + 2] = color.b;
  }
  
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  
  const material = new THREE.PointsMaterial({
    size: isMobile ? 2 : 3,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
  });
  
  particles = new THREE.Points(geometry, material);
  scene.add(particles);
};

// 创建波浪平面
const createWave = () => {
  const geometry = new THREE.PlaneGeometry(800, 800, 50, 50);
  
  // 自定义着色器材质
  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      color1: { value: new THREE.Color(0x4a90e2) },
      color2: { value: new THREE.Color(0x9b59b6) },
    },
    vertexShader: `
      uniform float time;
      varying vec2 vUv;
      varying float vElevation;
      
      void main() {
        vUv = uv;
        
        vec3 pos = position;
        float elevation = sin(pos.x * 0.05 + time) * 10.0 + 
                         sin(pos.y * 0.05 + time * 0.7) * 10.0;
        pos.z = elevation;
        vElevation = elevation;
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 color1;
      uniform vec3 color2;
      varying vec2 vUv;
      varying float vElevation;
      
      void main() {
        float mixStrength = (vElevation + 20.0) / 40.0;
        vec3 color = mix(color1, color2, mixStrength);
        gl_FragColor = vec4(color, 0.3);
      }
    `,
    transparent: true,
    wireframe: true,
  });
  
  wave = new THREE.Mesh(geometry, material);
  wave.rotation.x = -Math.PI * 0.3;
  wave.position.y = -100;
  scene.add(wave);
};

// 动画循环
const animate = () => {
  animationId = requestAnimationFrame(animate);
  
  const time = Date.now() * 0.001;
  
  // 粒子旋转和漂浮
  if (particles) {
    particles.rotation.y = time * 0.05;
    particles.rotation.x = Math.sin(time * 0.1) * 0.1;
    
    const positions = particles.geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
      positions[i + 1] += Math.sin(time + positions[i]) * 0.1;
    }
    particles.geometry.attributes.position.needsUpdate = true;
  }
  
  // 波浪动画
  if (wave) {
    wave.material.uniforms.time.value = time;
    wave.rotation.z = time * 0.05;
  }
  
  // 相机跟随鼠标
  camera.position.x += (mouseX - camera.position.x) * 0.05;
  camera.position.y += (-mouseY - camera.position.y) * 0.05;
  camera.lookAt(scene.position);
  
  renderer.render(scene, camera);
};

// 鼠标移动事件
const onMouseMove = (event) => {
  mouseX = (event.clientX - window.innerWidth / 2) * 0.1;
  mouseY = (event.clientY - window.innerHeight / 2) * 0.1;
};

// 窗口大小调整
const onWindowResize = () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  
  renderer.setSize(width, height);
};

onMounted(() => {
  initScene();
  createParticles();
  createWave();
  animate();
  
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('resize', onWindowResize);
});

onBeforeUnmount(() => {
  // 清理资源
  if (animationId) {
    cancelAnimationFrame(animationId);
  }
  
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('resize', onWindowResize);
  
  if (renderer) {
    renderer.dispose();
  }
  
  if (particles) {
    particles.geometry.dispose();
    particles.material.dispose();
  }
  
  if (wave) {
    wave.geometry.dispose();
    wave.material.dispose();
  }
  
  if (containerRef.value && renderer) {
    containerRef.value.removeChild(renderer.domElement);
  }
});
</script>

<style lang="scss" scoped>
.auth-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: -1;
  overflow: hidden;
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%);
}
</style>
