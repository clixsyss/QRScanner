<template>
  <div class="flash-detector">
    <video
      ref="videoRef"
      autoplay
      playsinline
      class="video-preview"
      :style="{ display: showPreview ? 'block' : 'none' }"
    />
    <canvas ref="canvasRef" style="display: none;" />
    
    <!-- Scanning Area Overlay -->
    <div v-if="isDetecting" class="scanning-overlay">
      <div class="scanning-area">
        <div class="scanning-frame">
          <div class="corner corner-tl"></div>
          <div class="corner corner-tr"></div>
          <div class="corner corner-bl"></div>
          <div class="corner corner-br"></div>
          <div class="scanning-line"></div>
        </div>
        <div class="scanning-instruction">
          <div class="text-h6 text-white q-mb-sm">Point camera at hardware module</div>
          <div class="text-body2 text-white">Keep the flashing area within the frame</div>
        </div>
      </div>
    </div>
    
    <div v-if="showInfo" class="detector-info">
      <div class="text-h6">Flash Detector</div>
      <div class="text-body2">Status: {{ isDetecting ? 'Detecting...' : 'Stopped' }}</div>
      <div class="text-body2">FPS: {{ actualFps }}</div>
      <div class="text-body2">Brightness: {{ currentBrightness.toFixed(2) }}</div>
      <div class="text-body2">Detected Bits: {{ detectedBits }}</div>
      <div class="text-body2">Threshold: {{ brightnessThreshold.toFixed(2) }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onUnmounted, watch } from 'vue'

const props = defineProps({
  /**
   * Camera device ID
   */
  cameraId: {
    type: String,
    default: null
  },
  /**
   * Expected code length (8, 16, etc.)
   */
  codeLength: {
    type: Number,
    default: 8
  },
  /**
   * Brightness threshold (0-255) for detecting flashes
   */
  brightnessThreshold: {
    type: Number,
    default: 128
  },
  /**
   * Show video preview
   */
  showPreview: {
    type: Boolean,
    default: true
  },
  /**
   * Show debug info
   */
  showInfo: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['codeDetected', 'error', 'frameRate'])

const videoRef = ref(null)
const canvasRef = ref(null)
const isDetecting = ref(false)
const currentBrightness = ref(0)
const detectedBits = ref('')
const actualFps = ref(0)

let stream = null
let animationFrameId = null
let frameCount = 0
let fpsStartTime = 0
let lastBitTime = 0
let lastBitValue = null
let canvasContext = null

/**
 * Start camera and begin detection
 */
const start = async () => {
  if (isDetecting.value) {
    stop()
  }

  try {
    // Get camera stream
    const constraints = {
      video: {
        deviceId: props.cameraId ? { exact: props.cameraId } : undefined,
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 30, min: 15 } // Request high frame rate
      }
    }

    stream = await navigator.mediaDevices.getUserMedia(constraints)
    
    if (videoRef.value) {
      videoRef.value.srcObject = stream
      await videoRef.value.play()
    }

    // Setup canvas
    if (canvasRef.value && videoRef.value) {
      canvasContext = canvasRef.value.getContext('2d')
      canvasRef.value.width = videoRef.value.videoWidth || 640
      canvasRef.value.height = videoRef.value.videoHeight || 480
    }

    isDetecting.value = true
    detectedBits.value = ''
    lastBitValue = null
    lastBitTime = performance.now()
    frameCount = 0
    fpsStartTime = performance.now()

    // Start detection loop
    detectLoop()
  } catch (error) {
    console.error('Error starting flash detector:', error)
    
    // Provide more detailed error information
    let errorMessage = 'Failed to access camera'
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      errorMessage = 'Camera permission denied. Please allow camera access.'
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      errorMessage = 'No camera found.'
    } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      errorMessage = 'Camera is already in use.'
    } else if (error.message) {
      errorMessage = error.message
    }
    
    emit('error', errorMessage)
    isDetecting.value = false
    throw error // Re-throw so parent can handle
  }
}

/**
 * Main detection loop - analyzes video frames for brightness changes
 */
const detectLoop = () => {
  if (!isDetecting.value || !videoRef.value || !canvasContext) {
    return
  }

  try {
    // Draw current video frame to canvas
    if (videoRef.value.readyState === videoRef.value.HAVE_ENOUGH_DATA) {
      canvasContext.drawImage(
        videoRef.value,
        0,
        0,
        canvasRef.value.width,
        canvasRef.value.height
      )

      // Get image data and calculate average brightness
      const imageData = canvasContext.getImageData(
        0,
        0,
        canvasRef.value.width,
        canvasRef.value.height
      )
      
      const brightness = calculateBrightness(imageData.data)
      currentBrightness.value = brightness

      // Detect bit based on brightness threshold
      const currentBit = brightness > props.brightnessThreshold ? '1' : '0'
      const currentTime = performance.now()

      // Track FPS
      frameCount++
      if (currentTime - fpsStartTime >= 1000) {
        actualFps.value = frameCount
        frameCount = 0
        fpsStartTime = currentTime
        emit('frameRate', actualFps.value)
      }

      // Detect bit changes (debounce to avoid noise)
      if (currentBit !== lastBitValue) {
        const timeSinceLastBit = currentTime - lastBitTime
        
        // Only register bit change if enough time has passed (debounce)
        if (timeSinceLastBit > 20) { // ~50fps minimum
          lastBitValue = currentBit
          lastBitTime = currentTime
          
          // Add bit to detected sequence
          detectedBits.value += currentBit
          
          // Limit to expected code length
          if (detectedBits.value.length > props.codeLength) {
            detectedBits.value = detectedBits.value.slice(-props.codeLength)
          }

          // Check if we have a complete code
          if (detectedBits.value.length === props.codeLength) {
            emit('codeDetected', detectedBits.value)
            // Reset for next detection
            detectedBits.value = ''
          }
        }
      }
    }
  } catch (error) {
    console.error('Error in detection loop:', error)
  }

  // Continue loop
  if (isDetecting.value) {
    animationFrameId = requestAnimationFrame(detectLoop)
  }
}

/**
 * Calculate average brightness from image data
 */
const calculateBrightness = (imageData) => {
  let totalBrightness = 0
  const pixelCount = imageData.length / 4 // RGBA = 4 values per pixel
  
  // Sample every 10th pixel for performance (can adjust)
  for (let i = 0; i < imageData.length; i += 40) {
    const r = imageData[i]
    const g = imageData[i + 1]
    const b = imageData[i + 2]
    // Calculate luminance using standard formula
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b
    totalBrightness += luminance
  }
  
  return totalBrightness / (pixelCount / 10) // Adjust for sampling
}

/**
 * Stop detection
 */
const stop = () => {
  isDetecting.value = false
  
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }

  if (stream) {
    stream.getTracks().forEach(track => track.stop())
    stream = null
  }

  if (videoRef.value) {
    videoRef.value.srcObject = null
  }

    detectedBits.value = ''
    lastBitValue = null
}

// Cleanup
onUnmounted(() => {
  stop()
})

// Watch for camera ID changes
watch(() => props.cameraId, () => {
  if (isDetecting.value) {
    stop()
    start()
  }
})

// Expose methods and state
defineExpose({
  start,
  stop,
  getDetectedBits: () => detectedBits.value,
  getActualFps: () => actualFps.value,
  getCurrentBrightness: () => currentBrightness.value,
  // Expose as properties for easier access
  detectedBits,
  currentBrightness,
  isDetecting
})
</script>

<style scoped>
.flash-detector {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9998;
}

.video-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: transparent;
  opacity: 0.3; /* Make camera feed very transparent so transmitter flashing is clearly visible */
}

.detector-info {
  position: absolute;
  top: 20px;
  left: 20px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 16px;
  border-radius: 8px;
  font-family: monospace;
  z-index: 10000;
  min-width: 250px;
}

.scanning-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  pointer-events: none;
}

.scanning-area {
  width: 80%;
  max-width: 400px;
  aspect-ratio: 1;
  position: relative;
}

.scanning-frame {
  width: 100%;
  height: 100%;
  border: 3px solid rgba(255, 255, 255, 0.8);
  border-radius: 12px;
  position: relative;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
}

.corner {
  position: absolute;
  width: 30px;
  height: 30px;
  border: 4px solid #4CAF50;
}

.corner-tl {
  top: -4px;
  left: -4px;
  border-right: none;
  border-bottom: none;
  border-top-left-radius: 12px;
}

.corner-tr {
  top: -4px;
  right: -4px;
  border-left: none;
  border-bottom: none;
  border-top-right-radius: 12px;
}

.corner-bl {
  bottom: -4px;
  left: -4px;
  border-right: none;
  border-top: none;
  border-bottom-left-radius: 12px;
}

.corner-br {
  bottom: -4px;
  right: -4px;
  border-left: none;
  border-top: none;
  border-bottom-right-radius: 12px;
}

.scanning-line {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 3px;
  background: linear-gradient(90deg, transparent, #4CAF50, transparent);
  animation: scanLine 2s linear infinite;
}

@keyframes scanLine {
  0% {
    top: 0;
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
  100% {
    top: 100%;
    opacity: 1;
  }
}

.scanning-instruction {
  position: absolute;
  bottom: -80px;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  background: rgba(0, 0, 0, 0.7);
  padding: 12px 20px;
  border-radius: 8px;
}
</style>

