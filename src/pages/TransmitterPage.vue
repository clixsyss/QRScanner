<template>
  <q-page class="transmitter-page">
    <!-- Fullscreen flashing display -->
    <div
      v-if="isActive"
      ref="displayRef"
      class="flash-display"
      :style="{ backgroundColor: displayColor }"
    />
    
    <!-- Minimal UI overlay (only when not active) -->
    <div v-if="!isActive" class="control-overlay">
      <div class="control-panel">
        <div class="text-h5 q-mb-md">Binary Signal Transmitter</div>
        
        <q-input
          v-model="binaryCode"
          label="Binary Code (8-16 bits)"
          hint="Enter binary string: e.g., 01011010"
          :rules="[val => /^[01]{8,16}$/.test(val) || 'Must be 8-16 bits (0s and 1s only)']"
          outlined
          class="q-mb-md"
        />

        <q-slider
          v-model="targetFps"
          :min="30"
          :max="120"
          label
          label-always
          :label-value="`Target FPS: ${targetFps}`"
          color="primary"
          class="q-mb-md"
        />

        <q-btn
          color="primary"
          size="lg"
          label="Start Transmission"
          icon="play_arrow"
          class="full-width"
          @click="handleStart"
        />
      </div>
    </div>

    <!-- Status overlay when active -->
    <div v-if="isActive" class="status-overlay">
      <q-card class="status-card">
        <q-card-section>
          <div class="text-h6 q-mb-sm">Transmitting</div>
          <div class="text-body2 q-mb-xs">
            Code: <strong>{{ binaryCode }}</strong>
          </div>
          <div class="text-body2 q-mb-xs">
            Bit: {{ currentBitIndex + 1 }}/{{ binaryCode.length }}
          </div>
          <div class="text-body2 q-mb-xs">
            FPS: {{ actualFps }}
          </div>
          <q-btn
            color="negative"
            label="Stop"
            icon="stop"
            size="sm"
            class="q-mt-sm full-width"
            @click="handleStop"
          />
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useTransmitter } from 'src/composables/useTransmitter'

const {
  isActive,
  currentBitIndex,
  actualFps,
  start,
  stop,
  getDisplayColor
} = useTransmitter()

const displayRef = ref(null)
const binaryCode = ref('01011010')
const targetFps = ref(60)

const displayColor = computed(() => getDisplayColor())

const handleStart = async () => {
  if (!binaryCode.value || !/^[01]{8,16}$/.test(binaryCode.value)) {
    return
  }

  try {
    await start(binaryCode.value, targetFps.value)
  } catch (error) {
    console.error('Error starting transmitter:', error)
  }
}

const handleStop = () => {
  stop()
}
</script>

<style scoped>
.transmitter-page {
  padding: 0;
  margin: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.flash-display {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1;
  transition: none;
  will-change: background-color;
  backface-visibility: hidden;
  transform: translateZ(0);
}

.control-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  background: rgba(0, 0, 0, 0.8);
}

.control-panel {
  background: white;
  padding: 32px;
  border-radius: 8px;
  min-width: 400px;
  max-width: 500px;
}

.status-overlay {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 100;
}

.status-card {
  min-width: 200px;
  background: rgba(255, 255, 255, 0.95);
}
</style>

