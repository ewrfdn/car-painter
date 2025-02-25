<template>
    <div :style="containerStyle" ref="container">
        <div :class="['floating-panel', 'color-picker']">
            <template v-if="!selectedPart">
                <div v-for="color in colors" :key="color" :style="{ backgroundColor: color }"
                    @click="changeColor(color)" class="color-option">
                </div>
                <div class="color-option custom-color">
                    <input type="color" @input="onCustomColorChange" :value="customColor" class="color-input">
                    <span class="plus-icon">+</span>
                </div>
            </template>
            <template v-else>
                <div v-for="color in colors" :key="color" :style="{ backgroundColor: color }"
                    @click="changePartColor(selectedPart, color)" class="color-option">
                </div>
                <div class="color-option custom-color">
                    <input type="color" @input="(e) => changePartColor(selectedPart, e.target.value)"
                        :value="customColor" class="color-input">
                    <span class="plus-icon">+</span>
                </div>
            </template>
        </div>

        <PartsPanel :parts="modelParts" @select-part="onPartSelect" class="parts-panel" />
    </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import { CarModelLoader } from '../utils/CarModelLoader'
import PartsPanel from './PartsPanel.vue'

const container = ref(null)
let carModelLoader

// 预设颜色选项
const colors = [
    '#ff0000', // 红色
    '#00ff00', // 绿色
    '#11dfff', // 蓝色
    '#ffffff', // 白色
    '#000000', // 黑色
]

const customColor = ref('#ffffff')

const onCustomColorChange = (event) => {
    const color = event.target.value
    customColor.value = color
    changeColor(color)
}

const updateSize = () => {
    if (!container.value) return;
    carModelLoader.updateCameraAspect(container.value.clientWidth, container.value.clientHeight);
    carModelLoader.updateRendererSize();
};

const modelParts = ref([])
const selectedPart = ref(null)

// 在模型加载完成后获取所有可更改颜色的部件
const initModelParts = () => {
    if (!carModelLoader?.carModel) return

    const parts = []
    carModelLoader.carModel.traverse((node) => {
        if (node.isMesh && !node.name.toLowerCase().includes('glass')) {
            // 为每个部件创建独立的材质副本
            if (Array.isArray(node.material)) {
                node.material = node.material.map(mat => mat.clone())
            } else {
                node.material = node.material.clone()
            }

            parts.push({
                name: node.name || `Part ${parts.length + 1}`,
                mesh: node,
                uuid: node.uuid // 添加唯一标识符
            })
        }
    })
    modelParts.value = parts
}

// 修改初始化场景函数
const initScene = async () => {
    carModelLoader = new CarModelLoader(colors, container.value);

    // 设置环境贴图
    setupEnvironmentMap();

    // 初始化场景内容
    await carModelLoader.initialize()

    // 设置控制器
    carModelLoader.fitCameraToModel();
    carModelLoader.adjustCameraAngle(0);
    initModelParts() // 添加这一行
}

// 设置环境贴图
const setupEnvironmentMap = () => {
    const renderer = carModelLoader.getRenderer();
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envLight = pmremGenerator.fromScene(new THREE.Scene()).texture;
    carModelLoader.getScene().environment = envLight;
    pmremGenerator.dispose();
}
const currentColor = ref(colors[2]);
const focusedPart = ref(null);
const changeColor = (color) => {
    currentColor.value = color;
    carModelLoader?.changeColor(color);
};

// 选择零件时的处理函数
const onPartSelect = (part) => {
    selectedPart.value = part
    onFocusPart(part)
}


// 聚焦到特定零件
const onFocusPart = (part) => {
    if (!part?.mesh) return;
    const mesh = carModelLoader.carModel.getObjectByProperty('uuid', part.mesh.uuid);
    if (mesh) {
        carModelLoader.focusOnPart(mesh);
    }
    changePartColor(part, colors[0]);
    changePartColor(focusedPart.value, currentColor.value);
    focusedPart.value = part;

}

// 修改特定零件的颜色
const changePartColor = (part, color) => {
    console.log(part)
    if (!part?.mesh) return;

    // 确保正在处理正确的网格
    const mesh = carModelLoader.carModel.getObjectByProperty('uuid', part.mesh.uuid);
    if (!mesh) return;

    console.log('Changing color for part:', part.name, 'to color:', color);
    carModelLoader.changePartColor(mesh, color);
}

const animate = () => {
    if (!carModelLoader.getRenderer()) return;

    requestAnimationFrame(animate);
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

/* 抽取公共面板样式 */
.floating-panel {
    position: absolute;
    background-color: rgba(255, 255, 255, 0.8);
    border-radius: 15px;
    padding: 15px;
    z-index: 1;
    backdrop-filter: blur(10px);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.color-picker {
    bottom: 40px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 20px;
}

.parts-panel {
    top: 40px;
    right: 40px;
    max-height: 60vh;
}

.selected-part-info {
    display: flex;
    align-items: center;
    margin-right: 10px;
    font-size: 14px;
    color: #333;
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

.custom-color {
    position: relative;
    overflow: hidden;
}

.color-input {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
}

.plus-icon {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 24px;
    color: #666;
    pointer-events: none;
}

.custom-color {
    background: linear-gradient(45deg, #f0f0f0 25%, #ddd 25%, #ddd 50%, #f0f0f0 50%, #f0f0f0 75%, #ddd 75%);
    background-size: 10px 10px;
}
</style>
