import { ref, onUnmounted } from 'vue'

/**
 * Frame Detector Composable
 * Captures camera frames and detects brightness to decode binary signals
 */
export function useFrameDetector() {
  const isDetecting = ref(false)
  const currentBrightness = ref(0)
  const detectedBits = ref('')
  const detectedBitstream = ref('')
  const frameRate = ref(0)
  const matchResult = ref(null) // 'granted' | 'denied' | null

  let videoElement = null
  let canvasElement = null
  let canvasContext = null
  let stream = null
  let animationFrameId = null
  let frameCount = 0
  let fpsStartTime = 0
  let expectedCode = ''
  let brightnessThreshold = 128
  let bitDuration = 0 // Will be calculated based on expected code length
  let bitSampleWindow = [] // Store brightness samples for each bit period
  let lastSampledBit = null
  let bitSampleStartTime = 0

  /**
   * Calculate average luminance from image data
   * Uses ITU-R BT.709 formula: 0.2126*R + 0.7152*G + 0.0722*B
   */
  const calculateBrightness = (imageData) => {
    const data = imageData.data
    let totalLuminance = 0
    let pixelCount = 0

    // Sample every 10th pixel for performance
    for (let i = 0; i < data.length; i += 40) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      
      // ITU-R BT.709 luminance formula
      const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
      totalLuminance += luminance
      pixelCount++
    }

    return pixelCount > 0 ? totalLuminance / pixelCount : 0
  }

  /**
   * Detect bit from brightness value with hysteresis to prevent rapid flipping
   */
  const detectBit = (brightness) => {
    // Use hysteresis: different thresholds for 0->1 and 1->0 transitions
    // This prevents rapid flipping when brightness is near the threshold
    const highThreshold = brightnessThreshold + 20 // Threshold for detecting '1' (increased for stability)
    const lowThreshold = brightnessThreshold - 20  // Threshold for detecting '0' (increased for stability)
    
    if (lastSampledBit === '1') {
      // If we're currently detecting '1', use lower threshold to switch to '0'
      // Only switch if brightness drops significantly below threshold
      return brightness < lowThreshold ? '0' : '1'
    } else if (lastSampledBit === '0') {
      // If we're currently detecting '0', use higher threshold to switch to '1'
      // Only switch if brightness rises significantly above threshold
      return brightness > highThreshold ? '1' : '0'
    } else {
      // Initial state: use standard threshold
      return brightness > brightnessThreshold ? '1' : '0'
    }
  }

  /**
   * Check if detected bitstream matches expected code
   */
  const checkMatch = (bitstream) => {
    if (!expectedCode || expectedCode.length === 0) {
      return false
    }

    const codeLength = expectedCode.length
    
    // Check if bitstream contains the expected code
    // Look for pattern in last N*2 bits (allowing for some noise)
    const searchWindow = bitstream.slice(-codeLength * 2)
    
    for (let i = 0; i <= searchWindow.length - codeLength; i++) {
      const candidate = searchWindow.slice(i, i + codeLength)
      if (candidate === expectedCode) {
        return true
      }
    }

    return false
  }

  /**
   * Detection loop - captures frames and processes brightness
   */
  const detectLoop = () => {
    if (!isDetecting.value || !videoElement || !canvasContext) return

    try {
      if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
        // Draw video frame to canvas
        canvasContext.drawImage(
          videoElement,
          0,
          0,
          canvasElement.width,
          canvasElement.height
        )

        // Get image data
        const imageData = canvasContext.getImageData(
          0,
          0,
          canvasElement.width,
          canvasElement.height
        )

        const currentTime = performance.now()
        
        // Calculate brightness
        const brightness = calculateBrightness(imageData)
        currentBrightness.value = brightness

        // Track frame rate
        frameCount++
        if (currentTime - fpsStartTime >= 1000) {
          frameRate.value = frameCount
          frameCount = 0
          fpsStartTime = currentTime
          
          // Recalculate bit duration when frame rate is known
          if (expectedCode && expectedCode.length > 0 && frameRate.value > 0) {
            // Transmitter shows each bit for: frameDuration * Math.max(1, Math.floor(targetFps / 30))
            // At 60 FPS: (1000/60) * Math.floor(60/30) = 16.67 * 2 = ~33ms per bit
            // At 30 FPS: (1000/30) * Math.floor(30/30) = 33.33 * 1 = ~33ms per bit
            const transmitterFps = 60 // Assume transmitter runs at 60 FPS
            const framesPerBit = Math.max(1, Math.floor(transmitterFps / 30))
            bitDuration = (1000 / transmitterFps) * framesPerBit
          }
        }
        
        // Calculate expected bit duration (initialize if not set)
        if (expectedCode && expectedCode.length > 0 && bitDuration === 0) {
          // Default: assume 60 FPS transmitter, 2 frames per bit = ~33ms
          // Transmitter formula: frameDuration * Math.max(1, Math.floor(targetFps / 30))
          // At 60 FPS: (1000/60) * Math.floor(60/30) = 16.67 * 2 = ~33.33ms
          bitDuration = (1000 / 60) * Math.max(1, Math.floor(60 / 30))
        }

        // Initialize bit sample window if empty
        if (bitSampleWindow.length === 0) {
          bitSampleStartTime = currentTime
        }
        
        // Collect brightness samples for the current bit period
        bitSampleWindow.push(brightness)
        
        // Calculate time elapsed since we started sampling this bit
        const timeSinceBitSample = currentTime - bitSampleStartTime
        
        // Sample bit value after collecting samples for the expected bit duration
        // Use a small tolerance to account for timing variations
        if (timeSinceBitSample >= bitDuration * 0.8 && bitSampleWindow.length > 0) {
          // Calculate average brightness over the bit period
          const avgBrightness = bitSampleWindow.reduce((sum, val) => sum + val, 0) / bitSampleWindow.length
          
          // Detect bit from averaged brightness (with hysteresis to prevent rapid flipping)
          const currentBit = detectBit(avgBrightness)
          
          // Always add the detected bit (don't check if different - we want all bits)
          // The hysteresis will prevent rapid flipping
          lastSampledBit = currentBit
          
          detectedBits.value = currentBit
          detectedBitstream.value += currentBit
          
          // Keep bitstream buffer manageable (last 100 bits)
          if (detectedBitstream.value.length > 100) {
            detectedBitstream.value = detectedBitstream.value.slice(-100)
          }

          // Check for match
          if (expectedCode && expectedCode.length > 0) {
            if (checkMatch(detectedBitstream.value)) {
              matchResult.value = 'granted'
              stop()
            }
          }
          
          // Reset bit sample window for next bit
          bitSampleWindow = []
          bitSampleStartTime = currentTime
        }
      }
    } catch (error) {
      console.error('Error in detection loop:', error)
    }

    if (isDetecting.value) {
      animationFrameId = requestAnimationFrame(detectLoop)
    }
  }

  /**
   * Start detection
   * @param {HTMLVideoElement} video - Video element capturing camera stream
   * @param {HTMLCanvasElement} canvas - Canvas element for frame extraction
   * @param {string} code - Expected binary code to match
   * @param {number} threshold - Brightness threshold (default: 128)
   * @param {string} cameraId - Optional camera device ID
   */
  const start = async (video, canvas, code = '', threshold = 128, cameraId = null) => {
    if (isDetecting.value) {
      stop()
    }

    videoElement = video
    canvasElement = canvas
    expectedCode = code
    brightnessThreshold = threshold

    if (!videoElement || !canvasElement) {
      throw new Error('Video and canvas elements are required')
    }

    // Get canvas context
    canvasContext = canvasElement.getContext('2d')
    
    // Set canvas dimensions to match video
    canvasElement.width = videoElement.videoWidth || 640
    canvasElement.height = videoElement.videoHeight || 480

    // Get camera stream
    try {
      const constraints = {
        video: {
          deviceId: cameraId ? { exact: cameraId } : undefined,
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30, min: 15 }
        }
      }

      stream = await navigator.mediaDevices.getUserMedia(constraints)
      videoElement.srcObject = stream
      await videoElement.play()

      // Initialize detection
      isDetecting.value = true
      detectedBits.value = ''
      detectedBitstream.value = ''
      matchResult.value = null
      lastSampledBit = null
      frameCount = 0
      fpsStartTime = performance.now()
      bitDuration = 0
      bitSampleWindow = []
      bitSampleStartTime = performance.now()

      // Start detection loop
      detectLoop()
    } catch (error) {
      console.error('Error starting frame detector:', error)
      isDetecting.value = false
      throw error
    }
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

    if (videoElement) {
      videoElement.srcObject = null
    }

    detectedBits.value = ''
    detectedBitstream.value = ''
    matchResult.value = null
    lastSampledBit = null
  }

  /**
   * Reset detection state
   */
  const reset = () => {
    detectedBits.value = ''
    detectedBitstream.value = ''
    matchResult.value = null
    lastSampledBit = null
  }

  onUnmounted(() => {
    stop()
  })

  return {
    isDetecting,
    currentBrightness,
    detectedBits,
    detectedBitstream,
    frameRate,
    matchResult,
    start,
    stop,
    reset
  }
}

