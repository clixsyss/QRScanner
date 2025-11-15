<template>
  <q-page class="receiver-page">
    <!-- Hidden video element for camera -->
    <video
      ref="videoRef"
      autoplay
      playsinline
      class="hidden-video"
    />

    <!-- Hidden canvas for frame extraction -->
    <canvas ref="canvasRef" class="hidden-canvas" />

    <!-- Main UI -->
    <div v-if="!isDetecting" class="control-overlay">
      <div class="control-panel">
        <div class="text-h5 q-mb-md">Binary Signal Receiver</div>
        
        <q-input
          v-model="expectedCode"
          label="Expected Binary Code"
          hint="Enter the code to match (e.g., 01011010)"
          :rules="[val => /^[01]{8,16}$/.test(val) || 'Must be 8-16 bits (0s and 1s only)']"
          outlined
          class="q-mb-md"
        />

        <q-select
          v-if="cameraOptions.length > 0"
          v-model="selectedCameraId"
          :options="cameraOptions"
          option-label="label"
          option-value="value"
          emit-value
          map-options
          outlined
          label="Select Camera"
          class="q-mb-md"
        />

        <q-slider
          v-model="brightnessThreshold"
          :min="50"
          :max="200"
          label
          label-always
          :label-value="`Brightness Threshold: ${brightnessThreshold}`"
          color="secondary"
          class="q-mb-md"
        />

        <q-btn
          color="secondary"
          size="lg"
          label="Start Detection"
          icon="camera_alt"
          class="full-width"
          :disable="!selectedCameraId && cameraOptions.length > 0"
          @click="handleStart"
        />
      </div>
    </div>

    <!-- Detection Status -->
    <div v-if="isDetecting" class="detection-overlay">
      <q-card class="detection-card">
        <q-card-section>
          <div class="text-h6 q-mb-md">
            <q-icon name="camera_alt" class="q-mr-sm" />
            Detecting Signal
          </div>

          <div class="info-section q-mb-md">
            <div class="text-body2 q-mb-xs">
              <strong>Expected Code:</strong> {{ expectedCode }}
            </div>
            <div class="text-body2 q-mb-xs">
              <strong>Current Bit:</strong> 
              <span class="text-primary text-weight-bold">{{ detectedBits || 'Waiting...' }}</span>
            </div>
            <div class="text-body2 q-mb-xs">
              <strong>Brightness:</strong> {{ currentBrightness.toFixed(1) }}
            </div>
            <div class="text-body2 q-mb-xs">
              <strong>Frame Rate:</strong> {{ frameRate }} fps
            </div>
            <div class="text-body2 q-mb-xs">
              <strong>Detected Stream:</strong>
              <div class="bitstream-display">{{ detectedBitstream || '...' }}</div>
            </div>
          </div>

          <q-btn
            color="negative"
            label="Stop Detection"
            icon="stop"
            class="full-width"
            @click="handleStop"
          />
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
            size="80px"
            class="q-mb-md"
          />
          <div
            :class="matchResult === 'granted' ? 'text-h4 text-positive' : 'text-h4 text-negative'"
            class="q-mb-sm"
          >
            {{ matchResult === 'granted' ? 'Gate Opened Successfully' : 'Access Denied' }}
          </div>
          <div class="text-body1 text-grey-7 q-mb-md">
            Expected: {{ expectedCode }}<br>
            Detected: {{ detectedBitstream.slice(-expectedCode.length) }}
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
import { ref, watch, onMounted } from 'vue'
import { useFrameDetector } from 'src/composables/useFrameDetector'
import { useCameraDevices } from 'src/composables/useCameraDevices'

const {
  isDetecting,
  currentBrightness,
  detectedBits,
  detectedBitstream,
  frameRate,
  matchResult,
  start,
  stop,
  reset
} = useFrameDetector()

const { cameraOptions, selectedCameraId, loadCameras } = useCameraDevices()

const videoRef = ref(null)
const canvasRef = ref(null)
const expectedCode = ref('01011010')
const brightnessThreshold = ref(128)
const showResultDialog = ref(false)

const handleStart = async () => {
  if (!expectedCode.value || !/^[01]{8,16}$/.test(expectedCode.value)) {
    return
  }

  if (!videoRef.value || !canvasRef.value) {
    console.error('Video or canvas element not available')
    return
  }

  try {
    reset()
    await start(videoRef.value, canvasRef.value, expectedCode.value, brightnessThreshold.value, selectedCameraId.value)
  } catch (error) {
    console.error('Error starting detection:', error)
    let errorMessage = 'Failed to start camera'
    
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      errorMessage = 'Camera permission denied. Please allow camera access.'
    } else if (error.name === 'NotFoundError') {
      errorMessage = 'No camera found.'
    } else if (error.name === 'NotReadableError') {
      errorMessage = 'Camera is already in use.'
    }
    
    alert(errorMessage)
  }
}

const handleStop = () => {
  stop()
}

// Watch for match result
watch(matchResult, (newValue) => {
  if (newValue) {
    showResultDialog.value = true
  }
})

const closeResultDialog = () => {
  showResultDialog.value = false
  stop()
}

onMounted(async () => {
  await loadCameras()
})
</script>

<style scoped>
.receiver-page {
  padding: 0;
  margin: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #000;
}

.hidden-video,
.hidden-canvas {
  position: absolute;
  top: -9999px;
  left: -9999px;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
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

.detection-overlay {
  position: fixed;
  top: 20px;
  left: 20px;
  z-index: 100;
}

.detection-card {
  min-width: 350px;
  max-width: 500px;
  background: rgba(255, 255, 255, 0.95);
}

.info-section {
  background: rgba(0, 0, 0, 0.05);
  padding: 16px;
  border-radius: 4px;
}

.bitstream-display {
  font-family: monospace;
  font-size: 12px;
  word-break: break-all;
  background: rgba(0, 0, 0, 0.1);
  padding: 8px;
  border-radius: 4px;
  margin-top: 8px;
}

.result-card {
  min-width: 350px;
}
</style>

