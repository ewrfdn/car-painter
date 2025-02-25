<template>
    <div class="parts-panel" :class="{
        'panel-collapsed': isCollapsed,
        'panel-minimized': isMinimized
    }">
        <div class="panel-header">
            <div class="header-content" @click="togglePanel">
                <span>零件视图</span>
                <span class="collapse-icon">{{ isCollapsed ? '+' : '-' }}</span>
            </div>
            <button class="minimize-button" @click="toggleMinimize">
                <span class="material-icons">{{ isMinimized ? 'chevron_left' : 'chevron_right' }}</span>
            </button>
        </div>
        <div class="panel-content" v-show="!isCollapsed">
            <div class="navigation-buttons">
                <button @click="previousPart" :disabled="!hasPrevious">上一个</button>
                <button @click="nextPart" :disabled="!hasNext">下一个</button>
            </div>
            <div class="parts-list">
                <div v-for="(part, index) in parts" :key="index"
                    :class="['part-item', { 'selected': selectedPartIndex === index }]">
                    <div class="part-info" @click="selectPart(index)">
                        {{ part.name || `零件 ${index + 1}` }}
                    </div>
                    <button class="view-button" @click="$emit('focus-part', part)">
                        <span class="material-icons">visibility</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
    parts: {
        type: Array,
        default: () => []
    }
})

const emit = defineEmits(['select-part'])

const isCollapsed = ref(false)
const isMinimized = ref(false)
const selectedPartIndex = ref(-1)

const hasPrevious = computed(() => selectedPartIndex.value > 0)
const hasNext = computed(() => selectedPartIndex.value < props.parts.length - 1)

const togglePanel = () => {
    isMinimized.value = !isMinimized.value
}

const toggleMinimize = () => {
    isMinimized.value = !isMinimized.value
    if (isMinimized.value) {
        isCollapsed.value = true
    }
}

const selectPart = (index) => {
    selectedPartIndex.value = index
    emit('select-part', props.parts[index], index)
}

const previousPart = () => {
    if (hasPrevious.value) {
        selectPart(selectedPartIndex.value - 1)
    }
}

const nextPart = () => {
    if (hasNext.value) {
        selectPart(selectedPartIndex.value + 1)
    }
}
</script>

<style scoped>
.parts-panel {
    right: 20px;
    position: fixed;
    top: 20px;
    width: 200px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
    height: 100%;
    overflow: auto;
}

.panel-minimized {
    right: 0;
    width: 40px;
    height: 40px;
    overflow: hidden;
}

.panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    background-color: #f5f5f5;
    border-radius: 8px 8px 0 0;
}

.header-content {
    flex: 1;
    cursor: pointer;
}

.minimize-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    margin-left: 8px;
    opacity: 0.6;
    transition: opacity 0.2s;
}

.minimize-button:hover {
    opacity: 1;
}

.panel-content {
    padding: 12px;
    height: calc(100% - 70px);
    overflow-y: auto;
}

/* 自定义滚动条样式 */
.panel-content::-webkit-scrollbar {
    width: 4px;
}

.panel-content::-webkit-scrollbar-track {
    background: transparent;
}

.panel-content::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 2px;
}

.panel-content::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.3);
}

.part-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    cursor: pointer;
    border-radius: 4px;
    margin: 4px 0;
    transition: background-color 0.2s;
}

.part-info {
    flex: 1;
}

.view-button {
    padding: 4px;
    margin-left: 8px;
    background: none;
    border: none;
    cursor: pointer;
    opacity: 0.6;
    transition: opacity 0.2s;
}

.view-button:hover {
    opacity: 1;
}

.material-icons {
    font-size: 16px;
}

.part-item:hover {
    background-color: rgba(0, 0, 0, 0.05);
}

.part-item.selected {
    background-color: rgba(0, 0, 0, 0.1);
}

.navigation-buttons {
    display: flex;
    justify-content: space-between;
    margin-bottom: 10px;
}

.navigation-buttons button {
    padding: 4px 12px;
    border-radius: 4px;
    border: 1px solid #ddd;
    background: white;
    cursor: pointer;
}

.navigation-buttons button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
</style>
