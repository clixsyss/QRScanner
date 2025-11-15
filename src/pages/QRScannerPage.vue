<template>
  <q-page class="flex flex-center column q-pa-md" style="padding: 0;">
    <!-- Dual Mode Transmitter - Keep visible during detection -->
    <HighSpeedBinaryTransmitter
      v-show="dualModeTransmittedCode && (isTransmittingDual || isDetectingFlashes)"
      ref="dualTransmitterRef"
      :binary-code="dualModeTransmittedCode || '00000000'"
      :target-fps="30"
      :show-info="false"
      @signal-completed="onDualTransmissionCompleted"
      @signal-started="() => { isTransmittingDual = true }"
    />

    <!-- Flash Detector - Hidden camera preview -->
    <FlashDetector
      v-show="isDetectingFlashes"
      ref="detectorRef"
      :camera-id="selectedCameraId"
      :code-length="flashCodeLength"
      :brightness-threshold="brightnessThreshold"
      :show-preview="false"
      :show-info="false"
      @code-detected="onFlashCodeDetected"
      @error="onDetectorError"
      @frame-rate="onDetectorFrameRate"
    />

    <!-- Main UI -->
    <div v-if="!isDetectingFlashes && !isTransmittingDual" class="column q-gutter-md" style="max-width: 500px; width: 100%; padding: 24px;">
      <q-btn flat icon="arrow_back" label="Back" @click="goBack" />
      
      <div class="text-h5 text-center">Dual Mode: Transmitter & Receiver</div>
      
      <!-- Transmitter Section -->
      <q-card>
        <q-card-section>
          <div class="text-subtitle1 q-mb-md">Transmitter</div>
          
          <q-input
            v-model.number="dualModeCodeLength"
            type="number"
            label="Code Length (bits)"
            :min="4"
            :max="32"
            outlined
            class="q-mb-md"
          />

      <q-btn
            color="primary"
            size="lg"
            icon="flash_on"
            label="Generate & Start Transmitting"
            class="full-width"
            @click="startDualModeTransmission"
          />
        </q-card-section>
      </q-card>

      <!-- Receiver Section -->
      <q-card>
        <q-card-section>
          <div class="text-subtitle1 q-mb-md">Receiver</div>
          
          <q-input
            v-model.number="flashCodeLength"
            type="number"
            label="Expected Code Length (bits)"
            :min="4"
            :max="32"
            outlined
            class="q-mb-md"
          />

          <q-slider
            v-model="brightnessThreshold"
            :min="50"
            :max="200"
            label
            label-always
            :label-value="`Threshold: ${brightnessThreshold}`"
            color="secondary"
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
            label="Camera Device"
            class="q-mb-md"
          />

          <q-btn
            color="secondary"
            size="lg"
            icon="camera_alt"
            label="Start Detection"
            class="full-width"
            @click="startFlashDetection"
            :disable="!dualModeTransmittedCode"
          />
          
          <div v-if="!dualModeTransmittedCode" class="text-caption text-warning q-mt-sm text-center">
            Start transmission first
          </div>
        </q-card-section>
      </q-card>
    </div>

    <!-- Transmission Status -->
    <div v-if="isTransmittingDual && !isDetectingFlashes" class="status-overlay">
      <q-card style="min-width: 300px;">
        <q-card-section>
          <div class="text-h6 q-mb-md">Transmitting Signal</div>
          
          <div class="q-mb-md">
            <div class="text-caption text-grey-7">Binary Code</div>
            <div class="text-h5 text-primary text-weight-bold">{{ dualModeTransmittedCode }}</div>
          </div>
          
          <div class="text-body2 text-info q-mb-md text-center">
            Screen is flashing. Start detection below to scan.
          </div>

          <q-btn
            color="negative"
            label="Stop Transmission"
            icon="stop"
            class="full-width q-mb-sm"
            @click="stopDualTransmission"
          />
          
          <q-btn
            color="secondary"
            label="Start Detection"
            icon="camera_alt"
            class="full-width"
            @click="startFlashDetection"
          />
        </q-card-section>
      </q-card>
    </div>

    <!-- Detection Status -->
    <div v-if="isDetectingFlashes" class="status-overlay">
      <q-card style="min-width: 300px;">
        <q-card-section>
          <div class="text-h6 q-mb-md">Detecting Signal</div>
          
          <div v-if="dualModeTransmittedCode" class="q-mb-md" style="background: rgba(25, 118, 210, 0.1); padding: 12px; border-radius: 8px;">
            <div class="text-caption text-grey-7 q-mb-xs">Transmitting Code:</div>
            <div class="text-h6 text-primary text-weight-bold">{{ dualModeTransmittedCode }}</div>
            <div class="text-caption text-info q-mt-xs">
              Point camera at the flashing screen
            </div>
        </div>

          <div class="q-mb-md">
            <div class="text-caption text-grey-7">Detected Bits</div>
            <div class="text-h5 text-secondary text-weight-bold">{{ detectedBits || 'Waiting...' }}</div>
        </div>

          <div v-if="detectedBits.length > 0" class="q-mb-md">
            <q-linear-progress
              :value="(detectedBits.length / flashCodeLength) * 100"
              color="positive"
              size="20px"
            >
              <div class="absolute-full flex flex-center">
                <q-badge
                  color="white"
                  text-color="primary"
                  :label="`${detectedBits.length}/${flashCodeLength}`"
                />
              </div>
            </q-linear-progress>
        </div>

          <div class="row q-gutter-md q-mb-md">
            <div class="col">
              <div class="text-caption text-grey-7">Frame Rate</div>
              <div class="text-body1 text-weight-bold">{{ detectorFrameRate || 0 }} fps</div>
            </div>
            <div class="col">
              <div class="text-caption text-grey-7">Brightness</div>
              <div class="text-body1 text-weight-bold">{{ currentBrightness.toFixed(1) }}</div>
            </div>
          </div>

          <q-btn
            color="negative"
            label="Stop Detection"
            icon="stop"
            class="full-width"
            @click="stopFlashDetection"
          />
          </q-card-section>
        </q-card>
    </div>

    <!-- Success Dialog -->
    <q-dialog v-model="showSuccessDialog" persistent>
      <q-card style="min-width: 300px;">
        <q-card-section class="text-center">
          <q-icon name="check_circle" size="64px" color="positive" class="q-mb-md" />
          <div class="text-h5 text-positive q-mb-sm">Access Granted!</div>
          <div class="text-body1 text-grey-7 q-mb-md">Detected Code: {{ detectedCode }}</div>
          <q-btn
            color="positive"
            label="Close"
            class="full-width"
            @click="closeSuccessDialog"
          />
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { Notify } from 'quasar'
import FlashDetector from 'src/components/FlashDetector.vue'
import HighSpeedBinaryTransmitter from 'src/components/HighSpeedBinaryTransmitter.vue'
import { useQrScanner } from 'src/composables/useQrScanner'

const router = useRouter()

const { cameraOptions, loadCameras } = useQrScanner()

// Dual mode transmitter state
const isTransmittingDual = ref(false)
const dualTransmitterRef = ref(null)
const dualModeTransmittedCode = ref('')
const dualModeCodeLength = ref(8)

// Detection state
const isDetectingFlashes = ref(false)
const detectorRef = ref(null)
const selectedCameraId = ref(null)
const flashCodeLength = ref(8)
const brightnessThreshold = ref(100)
const detectedBits = ref('')
const detectedCode = ref('')
const detectorFrameRate = ref(0)
const currentBrightness = ref(0)
const showSuccessDialog = ref(false)

let updateInterval = null

const generateRandomCode = (length) => {
  let code = ''
  for (let i = 0; i < length; i++) {
    code += Math.random() > 0.5 ? '1' : '0'
  }
  return code
}

const startDualModeTransmission = async () => {
  if (isTransmittingDual.value) return

  const code = generateRandomCode(dualModeCodeLength.value)
  dualModeTransmittedCode.value = code

  await nextTick()
  await new Promise(resolve => setTimeout(resolve, 100))

  if (dualTransmitterRef.value) {
    try {
      isTransmittingDual.value = true
      await dualTransmitterRef.value.start()
  } catch (error) {
      console.error('Error starting dual transmitter:', error)
      isTransmittingDual.value = false
      Notify.create({
        type: 'negative',
        message: 'Failed to start transmission',
        position: 'top',
        timeout: 3000
      })
    }
  }
}

const stopDualTransmission = () => {
  if (dualTransmitterRef.value) {
    dualTransmitterRef.value.stop()
  }
  isTransmittingDual.value = false
  // Keep the code so detection can restart transmission if needed
}

const onDualTransmissionCompleted = () => {
  // Keep transmitting if detection is active
  if (isDetectingFlashes.value && dualModeTransmittedCode.value) {
    setTimeout(async () => {
      if (dualTransmitterRef.value && dualModeTransmittedCode.value) {
        try {
          await dualTransmitterRef.value.start()
        } catch (error) {
          console.error('Error restarting transmission:', error)
    }
      }
    }, 100)
  } else {
    isTransmittingDual.value = false
  }
}

const startFlashDetection = async () => {
  if (isDetectingFlashes.value) return

  // Ensure transmitter is running
  if (dualModeTransmittedCode.value && !isTransmittingDual.value) {
    await startDualModeTransmission()
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  await nextTick()
  await new Promise(resolve => setTimeout(resolve, 100))

  if (detectorRef.value) {
    try {
      await detectorRef.value.start()
      isDetectingFlashes.value = true
      detectedBits.value = ''
      
      updateInterval = setInterval(() => {
        if (detectorRef.value) {
          const bits = detectorRef.value.getDetectedBits()
          const brightness = detectorRef.value.getCurrentBrightness()
          if (bits !== undefined) {
            detectedBits.value = bits
          }
          if (brightness !== undefined) {
            currentBrightness.value = brightness
          }
        }
      }, 100)
      
    } catch (error) {
      console.error('Error starting detector:', error)
      isDetectingFlashes.value = false
      
      let errorMessage = 'Failed to start camera'
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'Camera permission denied. Please allow camera access.'
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = 'No camera found.'
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = 'Camera is already in use.'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      Notify.create({
        type: 'negative',
        message: errorMessage,
        position: 'top',
        timeout: 5000
      })
    }
  }
}

const stopFlashDetection = () => {
  if (detectorRef.value) {
    detectorRef.value.stop()
  }
  
  if (updateInterval) {
    clearInterval(updateInterval)
    updateInterval = null
  }
  
  isDetectingFlashes.value = false
  detectedBits.value = ''
  currentBrightness.value = 0
  
  // Stop transmission when detection stops
  if (isTransmittingDual.value) {
    stopDualTransmission()
  }
}

const onFlashCodeDetected = (code) => {
  detectedCode.value = code
  showSuccessDialog.value = true
  stopFlashDetection()
  stopDualTransmission()
  Notify.create({
    type: 'positive',
    message: `Code detected: ${code}`,
    position: 'top',
    timeout: 3000
  })
}

const onDetectorError = (errorMessage) => {
  console.error('Detector error:', errorMessage)
  stopFlashDetection()
  Notify.create({
    type: 'negative',
    message: errorMessage,
    position: 'top',
    timeout: 4000
  })
}

const onDetectorFrameRate = (fps) => {
  detectorFrameRate.value = Math.round(fps)
}

const closeSuccessDialog = () => {
  showSuccessDialog.value = false
  detectedCode.value = ''
}

const goBack = () => {
  if (isDetectingFlashes.value) {
    stopFlashDetection()
  }
  if (isTransmittingDual.value) {
    stopDualTransmission()
  }
  router.push('/')
}

onMounted(async () => {
  await loadCameras()
  if (cameraOptions.value.length > 0) {
    selectedCameraId.value = cameraOptions.value[0].value
  }
})

onUnmounted(() => {
  if (updateInterval) {
    clearInterval(updateInterval)
  }
  if (isDetectingFlashes.value) {
    stopFlashDetection()
  }
  if (isTransmittingDual.value) {
    stopDualTransmission()
  }
})
</script>

<style scoped>
.status-overlay {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10000;
}
</style>
