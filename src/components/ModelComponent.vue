<template>
    <div :style="containerStyle" ref="container">
        <div class="color-picker">
            <div v-for="color in colors" :key="color" :style="{ backgroundColor: color }" @click="changeColor(color)"
                class="color-option"></div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { CarModelLoader } from '../utils/CarModelLoader'

const container = ref(null)
let controls
let carModelLoader

// 预设颜色选项
const colors = [
    '#ff0000', // 红色
    '#00ff00', // 绿色
    '#11dfff', // 蓝色
    '#ffffff', // 白色
    '#000000', // 黑色
]

const updateSize = () => {
    if (!container.value) return;
    carModelLoader.updateCameraAspect(container.value.clientWidth, container.value.clientHeight);
    carModelLoader.updateRendererSize();
};

const initScene = async () => {
    carModelLoader = new CarModelLoader(colors, container.value);

    // 设置环境贴图
    setupEnvironmentMap();

    // 初始化场景内容
    await carModelLoader.initialize()

    // 设置控制器
    setupControls();

    carModelLoader.fitCameraToModel();
    console.log(carModelLoader.getCamera().position);
    carModelLoader.adjustCameraAngle(0);
}

// 设置环境贴图
const setupEnvironmentMap = () => {
    const renderer = carModelLoader.getRenderer();
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envLight = pmremGenerator.fromScene(new THREE.Scene()).texture;
    carModelLoader.getScene().environment = envLight;
    pmremGenerator.dispose();
}

// 设置控制器
const setupControls = () => {
    controls = new OrbitControls(carModelLoader.getCamera(), carModelLoader.getCanvas());
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 5;
    controls.maxDistance = 30;
    controls.maxPolarAngle = Math.PI / 2;
    controls.minPolarAngle = 0.1;
    controls.target.set(0, 0, 0);
    controls.minAzimuthAngle = -Infinity;
    controls.maxAzimuthAngle = Infinity;
    controls.update();
}

const changeColor = (color) => {
    carModelLoader?.changeColor(color);
};

const animate = () => {
    if (!carModelLoader.getRenderer()) return;

    requestAnimationFrame(animate);
    controls?.update();
    carModelLoader.getRenderer().render(carModelLoader.getScene(), carModelLoader.getCamera());
}

const handleResize = () => {
    updateSize();
};

onMounted(() => {
    initScene();
    animate();
    window.addEventListener('resize', handleResize);
})

onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize);
})

// 修改组件的样式，确保容器占满整个视口
const containerStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    overflow: 'hidden'
};
</script>

<style scoped>
.model-container {
    width: 1920px;
    height: 1080px;
    /* 16:9 宽高比 */
    position: relative;
    overflow: hidden;
    background-color: #f0f0f0;
}

.color-picker {
    position: absolute;
    bottom: 40px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 20px;
    z-index: 1;
    padding: 15px;
    background-color: rgba(255, 255, 255, 0.8);
    border-radius: 15px;
}

.color-option {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    cursor: pointer;
    border: 3px solid white;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
    transition: transform 0.2s;
}

.color-option:hover {
    transform: scale(1.1);
    box-shadow: 0 0 15px rgba(0, 0, 0, 0.3);
}
</style>
