<template>
  <q-page class="flex flex-center column q-pa-md">
    <div class="full-width" style="max-width: 600px;">
      <q-btn
        flat
        icon="arrow_back"
        label="Back"
        @click="goBack"
        class="q-mb-md"
      />

      <div class="column q-gutter-md">
        <q-select
          v-if="cameraOptions.length > 0"
          v-model="selectedCameraId"
          :options="cameraOptions"
          option-label="label"
          option-value="value"
          emit-value
          map-options
          outlined
          label="Select camera"
          :disable="isScanning || isStarting"
          :loading="isLoadingCameras"
        />

        <div v-else-if="!isLoadingCameras" class="text-body2 text-negative">
          No cameras detected. Connect a camera and refresh the page.
        </div>

        <div v-if="scannerError" class="bg-negative text-white q-pa-sm q-rounded-borders">
          {{ scannerError }}
        </div>

        <div class="row q-gutter-sm">
          <q-btn
            color="primary"
            label="Start Scanner"
            icon="qr_code_scanner"
            class="col"
            size="lg"
            :loading="isStarting"
            :disable="isStarting || isScanning || !selectedCameraId"
            @click="prepareScanner"
          />
          <q-btn
            v-if="isScanning"
            color="negative"
            label="Stop"
            icon="close"
            class="col"
            size="lg"
            @click="stopScanner"
          />
        </div>

        <div v-if="isStarting" class="text-subtitle2 text-primary text-center">
          Starting camera...
        </div>

        <div v-show="showScanner" class="qr-reader-container">
          <div id="qr-reader"></div>
        </div>

        <q-card v-if="scannedData" class="q-mt-lg">
          <q-card-section>
            <div class="text-h6">Scanned Result</div>
            <div class="text-body1 q-mt-sm">{{ scannedData }}</div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { Html5Qrcode } from 'html5-qrcode'

const router = useRouter()
const cameras = ref([])
const cameraOptions = ref([])
const selectedCameraId = ref(null)
const isLoadingCameras = ref(false)
const isStarting = ref(false)
const showScanner = ref(false)
const isScanning = ref(false)
const scannerError = ref('')
const scannedData = ref('')
let html5QrCode = null

const loadCameras = async () => {
  isLoadingCameras.value = true
  scannerError.value = ''

  try {
    const devices = await Html5Qrcode.getCameras()

    if (!devices || devices.length === 0) {
      cameras.value = []
      cameraOptions.value = []
      scannerError.value = 'No cameras found. Connect a camera and try again.'
      return
    }

    cameras.value = devices
    cameraOptions.value = devices.map((device, index) => ({
      label: device.label || `Camera ${index + 1}`,
      value: device.id
    }))

    const preferredDevice = devices.find((device) => {
      const label = device.label?.toLowerCase() || ''
      return label.includes('back') || label.includes('rear') || label.includes('environment')
    })

    selectedCameraId.value = preferredDevice?.id || cameraOptions.value[0]?.value || null
  } catch (error) {
    console.error('Failed to load cameras:', error)
    scannerError.value = `Unable to access cameras. ${error?.message || error}`
  } finally {
    isLoadingCameras.value = false
  }
}

const ensureScannerStopped = async () => {
  if (html5QrCode) {
    try {
      await html5QrCode.stop()
    } catch (stopError) {
      console.warn('Error stopping scanner:', stopError)
    }

    try {
      html5QrCode.clear()
    } catch (clearError) {
      console.warn('Error clearing scanner:', clearError)
    }

    html5QrCode = null
  }
}

const isConstraintError = (error) => {
  const name = error?.name || ''
  const message = error?.message?.toLowerCase?.() || ''
  return name === 'OverconstrainedError' || message.includes('overconstrained') || message.includes('constraint')
}

const startWithConfig = async (cameraId, config) => {
  await ensureScannerStopped()
  html5QrCode = new Html5Qrcode('qr-reader')

  await html5QrCode.start(
    cameraId,
    config,
    (decodedText) => {
      scannedData.value = decodedText
      stopScanner()
    },
    (scanError) => {
      // Ignore scan errors to avoid console noise; the scanner keeps running
      if (process.env.NODE_ENV !== 'production') {
        console.debug('QR scan error:', scanError)
      }
    }
  )
}

const startScanner = async () => {
  const cameraId = selectedCameraId.value
  if (!cameraId) {
    throw new Error('No camera selected')
  }

  const preferredSize = Math.min(320, window.innerWidth - 48)
  const primaryConfig = {
    qrbox: preferredSize > 200 ? preferredSize : 200
  }

  try {
    await startWithConfig(cameraId, primaryConfig)
  } catch (error) {
    if (isConstraintError(error)) {
      console.warn('Primary camera constraints failed, retrying with defaults:', error)
      await startWithConfig(cameraId, undefined)
    } else {
      throw error
    }
  }
}

const prepareScanner = async () => {
  if (isStarting.value || isScanning.value) {
    return
  }

  scannerError.value = ''

  if (!selectedCameraId.value) {
    scannerError.value = 'Select a camera before starting.'
    return
  }

  scannedData.value = ''
  isStarting.value = true
  showScanner.value = true

  try {
    await nextTick()
    await startScanner()
    isScanning.value = true
  } catch (error) {
    console.error('Unable to start scanner:', error)
    scannerError.value = error?.message || error?.name || 'Failed to start the camera.'
    showScanner.value = false
    await ensureScannerStopped()
  } finally {
    isStarting.value = false
  }
}

const stopScanner = async () => {
  await ensureScannerStopped()
  isScanning.value = false
  showScanner.value = false
}

const goBack = async () => {
  await stopScanner()
  router.push('/')
}

onMounted(() => {
  loadCameras()
})

onUnmounted(() => {
  stopScanner()
})
</script>

<style scoped>
.qr-reader-container {
  width: 100%;
  min-height: 320px;
  border: 2px dashed rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  overflow: hidden;
}

.qr-reader-container #qr-reader {
  width: 100%;
}
</style>

