import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';

export class CarModelLoader {
    constructor(colors, container, modelPath = '/model/xiaomi_su7/scene.gltf') {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 10000);
        this.colors = colors;
        this.modelPath = modelPath;
        this.container = container;
        this.carModel = null;
        this.renderer = null;
        this.canvas = null;
        this.lights = {
            rectLight: null,
            lightMesh: null,
            edges: null
        };

        // 如果容器存在，立即初始化场景
        if (this.container) {
            this.initializeScene();
            this.initializeRenderer();
        }
    }

    // 初始化场景设置
    initializeScene() {
        // 设置场景背景
        this.scene.background = new THREE.Color(0x111111);
        // 更新相机宽高比
        if (this.container) {
            this.updateCameraAspect(this.container.clientWidth, this.container.clientHeight);
        }
    }

    // 初始化渲染器
    initializeRenderer() {
        // 创建 canvas
        this.canvas = document.createElement('canvas');
        this.container.appendChild(this.canvas);

        // 创建渲染器
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            precision: 'highp',
            powerPreference: 'high-performance',
        });

        // 设置渲染器属性
        const pixelRatio = Math.min(window.devicePixelRatio, 2);
        this.renderer.setPixelRatio(pixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.setClearColor(0x111111);

        // 设置渲染器尺寸
        this.updateRendererSize();
    }

    // 更新渲染器尺寸
    updateRendererSize() {
        if (!this.container || !this.renderer) return;

        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.renderer.setSize(width, height);
    }

    // 获取渲染器
    getRenderer() {
        return this.renderer;
    }

    // 获取 canvas
    getCanvas() {
        return this.canvas;
    }

    // 更新相机宽高比
    updateCameraAspect(width, height) {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }

    // 获取场景
    getScene() {
        return this.scene;
    }

    // 获取相机
    getCamera() {
        return this.camera;
    }

    // 初始化场景
    async initialize() {
        this.initLights();
        this.initFloor();
        await this.loadModel();
    }

    // 初始化光源
    initLights() {
        RectAreaLightUniformsLib.init();

        const width = 40;
        const height = 15;
        const intensity = 3;
        const rectLight = new THREE.RectAreaLight(0xffffff, intensity, width, height);
        rectLight.position.set(0, 30, 0);
        rectLight.rotation.x = -Math.PI / 2;
        rectLight.rotation.z = -Math.PI / 2;
        this.scene.add(rectLight);
        this.lights.rectLight = rectLight;

        // 创建发光平面
        const lightGeometry = new THREE.PlaneGeometry(width, height);
        const lightMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.3,
            emissive: 0xffffff,
            emissiveIntensity: 1.0
        });
        const lightMesh = new THREE.Mesh(lightGeometry, lightMaterial);
        lightMesh.position.copy(rectLight.position);
        lightMesh.rotation.copy(rectLight.rotation);
        this.scene.add(lightMesh);
        this.lights.lightMesh = lightMesh;

        // 添加发光边框效果
        const edgeGeometry = new THREE.EdgesGeometry(lightGeometry);
        const edgeMaterial = new THREE.LineBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 1
        });
        const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
        edges.position.copy(rectLight.position);
        edges.rotation.copy(rectLight.rotation);
        this.scene.add(edges);
        this.lights.edges = edges;
    }

    // 初始化地板
    initFloor() {
        const floorGeometry = new THREE.BoxGeometry(50, 1, 50);
        const floorMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x808080,
            roughness: 0.15,
            metalness: 0.9,
            envMapIntensity: 2.0,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1,
            reflectivity: 1.0,
            ior: 1.5,
            flatShading: false
        });

        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.position.y = -0.5;
        floor.receiveShadow = true;
        this.scene.add(floor);
    }

    // 加载模型
    loadModel() {
        const loader = new GLTFLoader();
        return new Promise((resolve, reject) => {
            loader.load(
                this.modelPath,
                (gltf) => {
                    this.carModel = gltf.scene;
                    if (this.carModel) {
                        this.setupModel();
                        resolve(this.carModel);
                    } else {
                        reject(new Error('模型加载失败：carModel 为空'));
                    }
                },
                undefined,
                (error) => {
                    console.error('模型加载错误:', error);
                    reject(error);
                }
            );
        });
    }

    // 设置模型
    setupModel() {
        // 调整车辆比例
        this.carModel.scale.set(1, 1, 1);

        // 调整车辆位置，确保轮胎接触地面
        this.carModel.position.set(0, -0.35, 0);

        // 调整车辆旋转，使其与地面平行
        this.carModel.rotation.y = -Math.PI / 2;

        // 调整材质
        this.carModel.traverse((node) => {
            if (node && node.isMesh) {
                if (Array.isArray(node.material)) {
                    node.material = node.material.map(mat => {
                        const newMat = this.processMaterial(mat, this.colors[2]);
                        newMat.envMapIntensity = 2.0;
                        return newMat;
                    }).filter(Boolean);
                } else if (node.material) {
                    const newMat = this.processMaterial(node.material, this.colors[2]);
                    newMat.envMapIntensity = 2.0;
                    node.material = newMat;
                }
                node.castShadow = true;
                node.receiveShadow = true;
            }
        });

        this.scene.add(this.carModel);
    }

    // 更改颜色
    changeColor(color) {
        if (!this.carModel || !color) return;

        this.carModel.traverse((node) => {
            if (node && node.isMesh) {
                if (Array.isArray(node.material)) {
                    node.material = node.material.map(mat => {
                        return mat ? this.processMaterial(mat, color) : null;
                    }).filter(Boolean);
                } else if (node.material) {
                    node.material = this.processMaterial(node.material, color);
                }
            }
        });
    }

    // 重置颜色
    resetColor() {
        if (!this.carModel) return;

        this.carModel.traverse((node) => {
            if (node && node.isMesh) {
                if (Array.isArray(node.material)) {
                    node.material = node.material.map(mat => {
                        return mat ? this.processMaterial(mat) : null;
                    }).filter(Boolean);
                } else if (node.material) {
                    node.material = this.processMaterial(node.material);
                }
            }
        });
    }

    // 处理材质
    processMaterial(material, color = null) {
        // 检查是否是需要保持原始状态的材质
        const isOriginalMaterial = (mat) => {
            const name = mat.name?.toLowerCase() || '';
            const meshMtlPattern = /mesh\d+mtl/i;
            return meshMtlPattern.test(name);
        };

        // 检查是否是需要保持原色的特殊材质
        const isSpecialMaterial = (mat) => {
            const name = mat.name?.toLowerCase() || '';
            return name.includes('light') ||
                name.includes('lamp') ||
                name.includes('logo') ||
                name.includes('emblem') ||
                name.includes('chrome') ||
                name.includes('tail') ||
                name.includes('led') ||
                name.includes('badge');
        };

        // 检查是否是玻璃材质
        const isGlass = material.name?.toLowerCase().includes('glass') ||
            material.name?.toLowerCase().includes('window') ||
            material.transparent === true;

        if (isOriginalMaterial(material)) {
            return this.createOriginalMaterial(material);
        } else if (isSpecialMaterial(material) && !color) {
            return this.createSpecialMaterial(material);
        } else if (isGlass) {
            return this.createGlassMaterial(material, color);
        } else {
            return this.createStandardMaterial(material, color);
        }
    }

    // 创建原始材质
    createOriginalMaterial(material) {
        const originalMaterial = new THREE.MeshPhysicalMaterial();

        Object.keys(material).forEach(key => {
            if (typeof material[key] !== 'function' && key !== 'uuid') {
                if (material[key] && typeof material[key].clone === 'function') {
                    originalMaterial[key] = material[key].clone();
                } else {
                    originalMaterial[key] = material[key];
                }
            }
        });

        const mapProperties = [
            'map', 'normalMap', 'roughnessMap', 'metalnessMap',
            'emissiveMap', 'aoMap', 'bumpMap', 'displacementMap',
            'lightMap', 'alphaMap'
        ];

        mapProperties.forEach(mapProp => {
            if (material[mapProp]) {
                originalMaterial[mapProp] = material[mapProp];
            }
        });

        return originalMaterial;
    }

    // 创建特殊材质
    createSpecialMaterial(material) {
        const specialMaterial = new THREE.MeshPhysicalMaterial({
            color: material.color ? material.color.clone() : new THREE.Color(0xffffff),
            metalness: 0.1,
            roughness: 0.2,
            envMapIntensity: 2.0,
            emissive: material.emissive ? material.emissive.clone() : new THREE.Color(0x000000),
            emissiveIntensity: material.emissiveIntensity || 1.0,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1
        });

        ['map', 'emissiveMap', 'normalMap', 'metalnessMap', 'roughnessMap'].forEach(mapType => {
            if (material[mapType]) specialMaterial[mapType] = material[mapType];
        });

        return specialMaterial;
    }

    // 创建玻璃材质
    createGlassMaterial(material, color) {
        const glassMaterial = new THREE.MeshPhysicalMaterial({
            transparent: true,
            opacity: 0.7,
            transmission: 1,
            roughness: 0,
            metalness: 0,
            clearcoat: 1.0,
            clearcoatRoughness: 0.05,
            ior: 1.45,
            color: color ? new THREE.Color(color).multiplyScalar(0.1) : new THREE.Color(0.95, 0.95, 1)
        });

        if (material.map) glassMaterial.map = material.map;
        if (material.normalMap) glassMaterial.normalMap = material.normalMap;

        return glassMaterial;
    }

    // 创建标准材质
    createStandardMaterial(material, color) {
        const newMaterial = new THREE.MeshPhysicalMaterial({
            metalness: 0.6,
            roughness: 0.15,
            envMapIntensity: 2.0,
            clearcoat: 0.5,
            clearcoatRoughness: 0.1,
            reflectivity: 1.0
        });

        if (color) {
            const newColor = new THREE.Color(color);
            newColor.multiplyScalar(1.2);
            newMaterial.color = newColor;
        } else {
            newMaterial.color = material.color ?
                material.color.clone().multiplyScalar(1.2) :
                new THREE.Color(0xffffff);
        }

        newMaterial.userData.originalColor = material.color ?
            material.color.clone() :
            new THREE.Color(0xffffff);

        ['map', 'normalMap', 'metalnessMap', 'roughnessMap'].forEach(mapType => {
            if (material[mapType]) {
                newMaterial[mapType] = material[mapType];
                if (mapType === 'map') newMaterial[mapType].intensity = 1.2;
            }
        });

        return newMaterial;
    }

    // 自动调整相机位置以适应模型大小
    fitCameraToModel() {
        if (!this.carModel || !this.camera) return;

        const box = new THREE.Box3().setFromObject(this.carModel);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        console.log(center);
        // 计算合适的相机距离
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = this.camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / Math.tan(fov/1.2)); // 移除了除以2，使距离加倍

        // 添加更大的额外空间
        cameraZ *= 1.8; // 增加倍数从1.5到2.5

        // 设置相机位置和目标，调整高度系数
        const heightFactor = 0.3; // 降低相机高度，从0.5改为0.3
        this.camera.position.set(0,10,0);
        this.camera.lookAt(center);

        // 更新相机的近平面和远平面
        this.camera.far = 2000; // 增加远平面距离
        this.camera.updateProjectionMatrix();
    }

    // 调整相机视角
    adjustCameraAngle(angle) {
        console.log(angle);
        if (!this.carModel || !this.camera) return;

        const box = new THREE.Box3().setFromObject(this.carModel);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const distance = maxDim * 2;

        // 如果angle是数字，按照角度旋转（水平旋转）
        if (typeof angle === 'number') {
            const radians = angle * (Math.PI / 180);
            const x = Math.sin(radians) * distance;
            const z = Math.cos(radians) * distance;
            this.camera.position.set(x, size.y / 2, z);
        } 
        // 如果angle是字符串，按照预设位置移动
        else if (typeof angle === 'string') {
            switch (angle.toLowerCase()) {
                case 'front':
                    this.camera.position.set(0, size.y / 2, distance);
                    break;
                case 'back':
                    this.camera.position.set(0, size.y / 2, -distance);
                    break;
                case 'left':
                    this.camera.position.set(-distance, size.y / 2, 0);
                    break;
                case 'right':
                    this.camera.position.set(distance, size.y / 2, 0);
                    break;
                case 'top':
                    this.camera.position.set(0, distance, 0);
                    break;
                case 'bottom':
                    this.camera.position.set(0, -distance, 0);
                    break;
                case '3/4':
                    this.camera.position.set(distance * 0.7, size.y * 0.7, distance * 0.7);
                    break;
                default:
                    console.warn('Invalid angle specified');
                    return;
            }
        } else {
            console.warn('Invalid angle parameter type');
            return;
        }
        console.log(center);
        this.camera.lookAt(center);
        this.camera.updateProjectionMatrix();
    }
}