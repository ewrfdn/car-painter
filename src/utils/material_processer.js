// 处理材质
import * as THREE from 'three';

export function processMaterial(material, color = null) {
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
    const isOrigina = isOriginalMaterial(material);
    const isSpecial = isSpecialMaterial(material)
    console.log(isOrigina, isSpecial, isGlass, color, material);
    if (isOrigina) {
        return createOriginalMaterial(material);
    } else if (isSpecial && !color) {
        return createSpecialMaterial(material);
    } else if (isGlass) {
        return createGlassMaterial(material, color);
    } else {
        return createStandardMaterial(material, color);
    }
}

// 创建原始材质
function createOriginalMaterial(material) {
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
function createSpecialMaterial(material) {
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
function createGlassMaterial(material, color) {
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
function createStandardMaterial(material, color) {
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