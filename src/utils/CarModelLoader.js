import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import gsap from 'gsap';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { processMaterial } from './material_processer.js';


export class CarModelLoader {
    constructor(colors, container, modelPath = '/model/xiaomi_su7/scene.gltf', processor=processMaterial) {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 10000);
        this.colors = colors;
        this.modelPath = modelPath;
        this.container = container;
        this.carModel = null;
        this.renderer = null;
        this.canvas = null;
        this.processMaterial = processor;
        this.controls = null;
        this.lights = {
            rectLight: null,
            lightMesh: null,
            edges: null
        };
        this.shadowPlane = null;
        this.shadowTexture = null;

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
            precision: 'lowp',
            powerPreference: 'low-power',
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
        this.setupControls();
    }

    // 初始化光源
    initLights() {
        RectAreaLightUniformsLib.init();

        // 顶部主光源
        let width = 10;
        let height = 20;
        const intensity = 3;
        const rectLight = new THREE.RectAreaLight(0xffffff, intensity, width, height);
        rectLight.position.set(0, 20, 0);
        rectLight.rotation.x = -Math.PI / 2;
        rectLight.rotation.z = -Math.PI / 2;
        this.scene.add(rectLight);
        this.lights.rectLight = rectLight;

        // 四个侧面点光源
        const pointIntensity = 5000;
        const distance = 200; // 增加距离到视野外
        // 创建发光平面（主光源）
        const lightGeometry = new THREE.BoxGeometry(width, height, 0.1);
        const lightMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8,
            emissive: 0xffffff,
            emissiveIntensity: 3.0
        });
        height = 10;
        width = 100
        // 创建点光源的通用设置函数
        const setupPointLight = (light) => {
            light.castShadow = false; // 禁用阴影投射
            light.shadow.mapSize.width = 512;
            light.shadow.mapSize.height = 512;
            light.shadow.camera.near = 1;
            light.shadow.camera.far = 100;
        };

        // 前光源
        const frontLight = new THREE.PointLight(0xffffff, pointIntensity);
        frontLight.position.set(0, height, distance);
        setupPointLight(frontLight);
        this.scene.add(frontLight);

        // 后光源
        const backLight = new THREE.PointLight(0xffffff, pointIntensity);
        backLight.position.set(0, height, -distance);
        setupPointLight(backLight);
        this.scene.add(backLight);

        // 左光源
        const leftLight = new THREE.PointLight(0xffffff, pointIntensity);
        leftLight.position.set(-distance, height, 0);
        setupPointLight(leftLight);
        this.scene.add(leftLight);

        // 右光源
        const rightLight = new THREE.PointLight(0xffffff, pointIntensity);
        rightLight.position.set(distance, height, 0);
        setupPointLight(rightLight);
        this.scene.add(rightLight);


        const lightMesh = new THREE.Mesh(lightGeometry, lightMaterial);
        lightMesh.position.copy(rectLight.position);
        lightMesh.rotation.copy(rectLight.rotation);
        this.scene.add(lightMesh);
        this.lights.lightMesh = lightMesh;

        // 添加发光边框效果（主光源）
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

        // 存储所有光源引用
        this.lights = {
            ...this.lights,
            frontLight,
            backLight,
            leftLight,
            rightLight
        };
    }

    // 初始化地板
    initFloor() {
        const floorGeometry = new THREE.BoxGeometry(50, 1, 50);
        const floorMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x808080,
            roughness: 0.7,
            metalness: 0.1,
            envMapIntensity: 0.1,
            clearcoat: 0.0,
            clearcoatRoughness: 1.0,
            reflectivity: 0.2,
            ior: 1.0,
            flatShading: false,
            transparent: false, // 移除地板的透明度
            opacity: 1
        });

        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.position.y = -0.5;
        floor.receiveShadow = true;
        floor.renderOrder = 1;
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
        // 添加投影
        // this.createShadowPlane();
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

    // 自动调整相机位置以适应模型大小
    fitCameraToModel() {
        if (!this.carModel || !this.camera) return;

        const box = new THREE.Box3().setFromObject(this.carModel);
        // const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        console.log(center);
        // 计算合适的相机距离
        // const maxDim = Math.max(size.x, size.y, size.z);
        // const fov = this.camera.fov * (Math.PI / 180);
        // let cameraZ = Math.abs(maxDim / Math.tan(fov / 1.2)); // 移除了除以2，使距离加倍

        // 添加更大的额外空间
        // cameraZ *= 1.8; // 增加倍数从1.5到2.5

        // 设置相机位置和目标，调整高度系数
        // const heightFactor = 0.3; // 降低相机高度，从0.5改为0.3
        this.camera.position.set(0, 10, 0);
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

    // 更改单个部件的颜色
    changePartColor(mesh, color) {
        if (!mesh || !color) return;

        const newMaterial = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color(color),
            metalness: 0.6,
            roughness: 0.15,
            envMapIntensity: 2.0,
            clearcoat: 0.5,
            clearcoatRoughness: 0.1,
            reflectivity: 1.0
        });

        // 保存原始贴图
        if (mesh.material.map) newMaterial.map = mesh.material.map;
        if (mesh.material.normalMap) newMaterial.normalMap = mesh.material.normalMap;
        if (mesh.material.metalnessMap) newMaterial.metalnessMap = mesh.material.metalnessMap;
        if (mesh.material.roughnessMap) newMaterial.roughnessMap = mesh.material.roughnessMap;

        mesh.material = newMaterial;
        mesh.material.needsUpdate = true;
    }

    // 设置控制器
    setupControls() {
        let controls = new OrbitControls(this.camera, this.canvas);
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
        this.controls = controls;
    }
    // 移动相机到零件位置
    focusOnPart(mesh) {
        if (!mesh || !this.camera) return;

        // 计算零件的包围盒
        const box = new THREE.Box3().setFromObject(mesh);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        // 计算合适的相机距离
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = this.camera.fov * (Math.PI / 180);
        let distance = Math.abs(maxDim / Math.tan(fov / 2));

        // 添加一些额外空间
        distance *= 1.5;

        // 计算相机位置
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);

        // 设置新的相机位置
        const newPosition = center.clone().add(direction.multiplyScalar(-distance));

        // 使用动画过渡到新位置
        // const startPosition = this.camera.position.clone();
        // const startTarget = this.controls.target.clone();

        gsap.to(this.camera.position, {
            x: newPosition.x,
            y: newPosition.y,
            z: newPosition.z,
            duration: 1,
            ease: "power2.inOut"
        });

        gsap.to(this.controls.target, {
            x: center.x,
            y: center.y,
            z: center.z,
            duration: 1,
            ease: "power2.inOut",
            onUpdate: () => {
                this.camera.lookAt(this.controls.target);
                this.camera.updateProjectionMatrix();
            }
        });
    }

    // 添加新方法：创建投影
    createShadowPlane() {
        // 创建投影纹理
        const shadowTexture = new THREE.CanvasTexture(this.generateShadowTexture());

        // 创建投影平面的材质
        const shadowMaterial = new THREE.MeshBasicMaterial({
            map: shadowTexture,
            transparent: true,
            opacity: 0.6, // 增加不透明度
            depthWrite: false,
            blending: THREE.MultiplyBlending
        });

        // 创建更大的投影平面
        const shadowGeometry = new THREE.PlaneGeometry(25, 8); // 调整尺寸以匹配车辆
        const shadowPlane = new THREE.Mesh(shadowGeometry, shadowMaterial);
        shadowPlane.rotation.x = -Math.PI / 2;
        shadowPlane.position.y = -0.2; // 调整高度，使其更靠近地面
        shadowPlane.position.z = 0.5; // 微调前后位置
        shadowPlane.renderOrder = 2; // 确保投影在最上层

        this.scene.add(shadowPlane);
        this.shadowPlane = shadowPlane;
        this.shadowTexture = shadowTexture;
    }

    // 生成投影纹理
    generateShadowTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 1024; // 增加分辨率
        canvas.height = 1024;
        const context = canvas.getContext('2d');

        // 创建椭圆形渐变
        const gradient = context.createRadialGradient(
            canvas.width / 2,
            canvas.height / 2,
            0,
            canvas.width / 2,
            canvas.height / 2,
            canvas.width / 3
        );

        gradient.addColorStop(0, 'rgba(0,0,0,0.7)'); // 增加中心不透明度
        gradient.addColorStop(0.5, 'rgba(0,0,0,0.3)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');

        // 填充渐变
        context.fillStyle = gradient;
        context.fillRect(0, 0, canvas.width, canvas.height);

        return canvas;
    }
}