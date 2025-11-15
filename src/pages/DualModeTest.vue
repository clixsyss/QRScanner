<template>
  <q-page class="dual-mode-page">
    <!-- Transmitter (Left Side) -->
    <div class="transmitter-section">
      <!-- Transmitter Display - Always visible when transmitting -->
      <div
        v-if="isTransmitting"
        ref="transmitterDisplayRef"
        class="transmitter-display"
        :style="{ backgroundColor: transmitterColor }"
      />
      
      <!-- Transmitter Controls - Only show when not transmitting -->
      <div v-if="!isTransmitting" class="transmitter-controls">
        <div class="text-h6 q-mb-md">Transmitter</div>
        
        <q-input
          v-model="transmitterCode"
          label="Binary Code (8-16 bits)"
          :rules="[val => /^[01]{8,16}$/.test(val) || 'Must be 8-16 bits']"
          outlined
          dense
          class="q-mb-sm"
        />

        <q-slider
          v-model="transmitterFps"
          :min="30"
          :max="120"
          label
          :label-value="`FPS: ${transmitterFps}`"
          color="primary"
          dense
          class="q-mb-md"
        />

        <q-btn
          color="primary"
          label="Start Transmitter"
          icon="play_arrow"
          class="full-width"
          @click="startTransmitter"
        />
      </div>

      <!-- Transmitter Status -->
      <div v-if="isTransmitting" class="transmitter-status">
        <q-card class="status-card">
          <q-card-section>
            <div class="text-subtitle2 q-mb-xs">Transmitting</div>
            <div class="text-caption">Code: {{ transmitterCode }}</div>
            <div class="text-caption">FPS: {{ transmitterFps }}</div>
            <q-btn
              color="negative"
              label="Stop"
              size="xs"
              dense
              class="q-mt-sm full-width"
              @click="stopTransmitter"
            />
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Receiver (Right Side) -->
    <div class="receiver-section">
      <!-- Video and canvas -->
      <video
        ref="videoRef"
        autoplay
        playsinline
        muted
        :class="isDetecting ? 'camera-preview-video' : 'hidden-video'"
      />
      <canvas ref="canvasRef" class="hidden-canvas" />

      <!-- Receiver Controls -->
      <div v-if="!isDetecting" class="receiver-controls">
        <div class="text-h6 q-mb-md">Receiver</div>
        
        <q-select
          v-if="cameraOptions.length > 0"
          v-model="selectedCameraId"
          :options="cameraOptions"
          option-label="label"
          option-value="value"
          emit-value
          map-options
          outlined
          dense
          label="Select Camera"
          class="q-mb-sm"
        />

        <q-input
          v-model="receiverCode"
          label="Expected Code"
          :rules="[val => /^[01]{8,16}$/.test(val) || 'Must be 8-16 bits']"
          outlined
          dense
          class="q-mb-sm"
        />

        <q-slider
          v-model="brightnessThreshold"
          :min="50"
          :max="200"
          label
          :label-value="`Threshold: ${brightnessThreshold}`"
          color="secondary"
          dense
          class="q-mb-md"
        />

        <q-btn
          color="secondary"
          label="Start Detection"
          icon="camera_alt"
          class="full-width"
          :disable="!isTransmitting || (!selectedCameraId && cameraOptions.length > 0)"
          @click="startDetection"
        />
        
        <div v-if="!isTransmitting" class="text-caption text-warning q-mt-sm text-center">
          Start transmitter first
        </div>
      </div>

      <!-- Detection Status -->
      <div v-if="isDetecting" class="receiver-status">
        <q-card class="status-card">
          <q-card-section>
            <div class="text-subtitle2 q-mb-xs">Detecting</div>
            <div class="text-caption q-mb-xs">
              Current Bit: <strong>{{ detectedBits || '...' }}</strong>
            </div>
            <div class="text-caption q-mb-xs">
              Brightness: {{ currentBrightness.toFixed(1) }}
            </div>
            <div class="text-caption q-mb-xs">
              FPS: {{ frameRate }}
            </div>
            <div class="text-caption q-mb-xs">
              Stream: <span class="bitstream">{{ detectedBitstream.slice(-20) || '...' }}</span>
            </div>
            <q-btn
              color="negative"
              label="Stop"
              size="xs"
              dense
              class="q-mt-sm full-width"
              @click="stopDetection"
            />
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Debug Console (Bottom) -->
    <div class="debug-console">
      <q-card>
        <q-card-section>
          <div class="text-subtitle2 q-mb-sm">Debug Console</div>
          <div class="debug-content">
            <!-- Camera Preview -->
            <div v-if="isDetecting" class="camera-preview-section q-mb-md">
              <div class="text-caption q-mb-xs">Camera Preview:</div>
              <!-- Video element is rendered above, styled here when detecting -->
            </div>
            
            <!-- Debug Info -->
            <div class="debug-info">
              <div class="debug-row">
                <span class="debug-label">Transmitter:</span>
                <span :class="isTransmitting ? 'text-positive' : 'text-grey'">
                  {{ isTransmitting ? 'Active' : 'Inactive' }}
                </span>
              </div>
              <div class="debug-row">
                <span class="debug-label">Receiver:</span>
                <span :class="isDetecting ? 'text-positive' : 'text-grey'">
                  {{ isDetecting ? 'Active' : 'Inactive' }}
                </span>
              </div>
              <div class="debug-row">
                <span class="debug-label">Match Result:</span>
                <span
                  :class="matchResult === 'granted' ? 'text-positive' : matchResult === 'denied' ? 'text-negative' : 'text-grey'"
                >
                  {{ matchResult || 'Pending' }}
                </span>
              </div>
              <div class="debug-row">
                <span class="debug-label">Detected Bits:</span>
                <span class="text-primary">{{ detectedBits || '...' }}</span>
              </div>
              <div class="debug-row">
                <span class="debug-label">Brightness:</span>
                <span>{{ currentBrightness.toFixed(1) }}</span>
              </div>
              <div class="debug-row">
                <span class="debug-label">Stream:</span>
                <span class="bitstream-text">{{ detectedBitstream.slice(-20) || '...' }}</span>
              </div>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </div>

    <!-- Result Dialog -->
    <q-dialog v-model="showResultDialog" persistent>
      <q-card class="result-card">
        <q-card-section class="text-center">
          <q-icon
            :name="matchResult === 'granted' ? 'check_circle' : 'cancel'"
            :color="matchResult === 'granted' ? 'positive' : 'negative'"
            size="64px"
            class="q-mb-md"
          />
          <div
            :class="matchResult === 'granted' ? 'text-h5 text-positive' : 'text-h5 text-negative'"
            class="q-mb-sm"
          >
            {{ matchResult === 'granted' ? 'GATE OPENED' : 'ACCESS DENIED' }}
          </div>
          <div class="text-body2 text-grey-7 q-mb-md">
            Expected: {{ receiverCode }}<br>
            Detected: {{ detectedBitstream.slice(-receiverCode.length) }}
          </div>
          <q-btn
            :color="matchResult === 'granted' ? 'positive' : 'negative'"
            label="Close"
            class="full-width"
            @click="closeResultDialog"
          />
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useTransmitter } from 'src/composables/useTransmitter'
import { useFrameDetector } from 'src/composables/useFrameDetector'
import { useCameraDevices } from 'src/composables/useCameraDevices'

// Transmitter
const {
  isActive: isTransmitting,
  start: startTransmitterFn,
  stop: stopTransmitterFn,
  getDisplayColor
} = useTransmitter()

const transmitterDisplayRef = ref(null)
const transmitterCode = ref('01011010')
const transmitterFps = ref(60)

const transmitterColor = computed(() => getDisplayColor())

const startTransmitter = async () => {
  if (!transmitterCode.value || !/^[01]{8,16}$/.test(transmitterCode.value)) {
    return
  }
  try {
    await startTransmitterFn(transmitterCode.value, transmitterFps.value)
  } catch (error) {
    console.error('Error starting transmitter:', error)
  }
}

const stopTransmitter = () => {
  stopTransmitterFn()
}

// Receiver
const {
  isDetecting,
  currentBrightness,
  detectedBits,
  detectedBitstream,
  frameRate,
  matchResult,
  start: startDetectionFn,
  stop: stopDetectionFn,
  reset: resetDetection
} = useFrameDetector()

const { cameraOptions, selectedCameraId, loadCameras } = useCameraDevices()

const videoRef = ref(null)
const canvasRef = ref(null)
const receiverCode = ref('01011010')
const brightnessThreshold = ref(128)
const showResultDialog = ref(false)

const startDetection = async () => {
  // Ensure transmitter is running
  if (!isTransmitting.value) {
    // Auto-start transmitter if code matches
    if (transmitterCode.value === receiverCode.value && transmitterCode.value) {
      await startTransmitter()
      // Wait a bit for transmitter to start
      await new Promise(resolve => setTimeout(resolve, 200))
    } else {
      alert('Please start transmitter first, or ensure transmitter code matches receiver code')
      return
    }
  }

  if (!receiverCode.value || !/^[01]{8,16}$/.test(receiverCode.value)) {
    return
  }

  if (!videoRef.value || !canvasRef.value) {
    console.error('Video or canvas element not available')
    return
  }

  try {
    resetDetection()
    await startDetectionFn(videoRef.value, canvasRef.value, receiverCode.value, brightnessThreshold.value, selectedCameraId.value)
  } catch (error) {
    console.error('Error starting detection:', error)
    let errorMessage = 'Failed to start camera'
    
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      errorMessage = 'Camera permission denied.'
    } else if (error.name === 'NotFoundError') {
      errorMessage = 'No camera found.'
    } else if (error.name === 'NotReadableError') {
      errorMessage = 'Camera is already in use.'
    }
    
    alert(errorMessage)
  }
}

const stopDetection = () => {
  stopDetectionFn()
}

// Watch for match result
watch(matchResult, (newValue) => {
  if (newValue) {
    showResultDialog.value = true
  }
})

const closeResultDialog = () => {
  showResultDialog.value = false
  stopDetection()
}

onMounted(async () => {
  await loadCameras()
})
</script>

<style scoped>
.dual-mode-page {
  padding: 0;
  margin: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.transmitter-section,
.receiver-section {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.transmitter-section {
  border-right: 2px solid rgba(255, 255, 255, 0.2);
}

.transmitter-display {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  transition: none;
  will-change: background-color;
}

.transmitter-controls,
.receiver-controls {
  position: relative;
  z-index: 10;
  background: rgba(255, 255, 255, 0.95);
  padding: 24px;
  border-radius: 8px;
  min-width: 280px;
  max-width: 320px;
}

.transmitter-status,
.receiver-status {
  position: absolute;
  top: 20px;
  z-index: 100;
}

.transmitter-status {
  left: 20px;
}

.receiver-status {
  right: 20px;
}

.status-card {
  min-width: 200px;
  background: rgba(255, 255, 255, 0.95);
}

.hidden-video {
  position: absolute;
  top: -9999px;
  left: -9999px;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.camera-preview-video {
  position: fixed;
  bottom: 200px;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 400px;
  max-height: 200px;
  border: 2px solid rgba(255, 255, 255, 0.5);
  border-radius: 8px;
  background: #000;
  object-fit: contain;
  z-index: 1001;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.8);
}

.hidden-canvas {
  position: absolute;
  top: -9999px;
  left: -9999px;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.debug-console {
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  padding: 16px;
  background: rgba(0, 0, 0, 0.9);
  max-height: 40vh;
  overflow-y: auto;
}

.debug-content {
  display: flex;
  flex-direction: column;
}

.camera-preview-section {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.camera-preview-video {
  width: 100%;
  max-width: 400px;
  max-height: 200px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  background: #000;
  object-fit: contain;
  display: block;
  margin: 0 auto;
}

.debug-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
}

.debug-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  align-items: center;
}

.debug-label {
  font-weight: bold;
  margin-right: 16px;
  min-width: 100px;
}

.bitstream {
  font-family: monospace;
  font-size: 10px;
}

.bitstream-text {
  font-family: monospace;
  font-size: 11px;
  word-break: break-all;
  max-width: 200px;
  text-align: right;
}

.result-card {
  min-width: 300px;
}

@media (max-width: 768px) {
  .dual-mode-page {
    flex-direction: column;
  }
  
  .transmitter-section,
  .receiver-section {
    min-height: 50vh;
  }
}
</style>

