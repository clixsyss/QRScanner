import { ref, onUnmounted } from 'vue'

/**
 * Binary Transmitter Composable
 * Flashes screen black/white based on binary string at >30 FPS
 * Loops continuously after completing the sequence
 */
export function useTransmitter() {
  const isActive = ref(false)
  const currentBitIndex = ref(0)
  const currentBit = ref('')
  const frameCount = ref(0)
  const actualFps = ref(0)

  let binaryCode = ''
  let animationFrameId = null
  let fpsStartTime = 0
  let bitStartTime = 0
  let frameDuration = 0
  let targetFps = 60

  /**
   * Detect device frame rate capability
   */
  const detectFrameRate = async () => {
    return new Promise((resolve) => {
      let frames = 0
      const startTime = performance.now()
      
      const measure = () => {
        frames++
        if (frames < 60) {
          requestAnimationFrame(measure)
        } else {
          const elapsed = performance.now() - startTime
          const detectedFps = Math.round((frames / elapsed) * 1000)
          resolve(Math.max(30, Math.min(detectedFps, 120)))
        }
      }
      
      requestAnimationFrame(measure)
    })
  }

  /**
   * Start transmitting binary code
   * @param {string} code - Binary string (e.g., "01011010")
   * @param {number} fps - Target FPS (default: 60)
   */
  const start = async (code, fps = 60) => {
    if (isActive.value) {
      stop()
    }

    if (!code || !/^[01]+$/.test(code)) {
      throw new Error('Invalid binary code. Must contain only 0s and 1s.')
    }

    binaryCode = code
    targetFps = Math.max(30, Math.min(fps, 120))
    
    // Detect actual device capability
    const deviceFps = await detectFrameRate()
    targetFps = Math.min(deviceFps, targetFps)
    frameDuration = 1000 / targetFps

    isActive.value = true
    currentBitIndex.value = 0
    currentBit.value = binaryCode[0]
    frameCount.value = 0
    fpsStartTime = performance.now()
    bitStartTime = performance.now()

    animate()
  }

  /**
   * Animation loop - pure frame swapping, no transitions
   */
  const animate = () => {
    if (!isActive.value) return

    const currentTime = performance.now()
    const elapsed = currentTime - bitStartTime
    
    // Calculate which bit we should be showing
    // Each bit duration = frameDuration * (codeLength / targetFps) to ensure smooth playback
    // Use modulo to loop continuously: 0, 1, 2, ..., length-1, 0, 1, 2, ...
    const bitDuration = frameDuration * Math.max(1, Math.floor(targetFps / 30))
    const targetBitIndex = Math.floor(elapsed / bitDuration) % binaryCode.length

    // Update bit if changed
    if (targetBitIndex !== currentBitIndex.value) {
      currentBitIndex.value = targetBitIndex
      currentBit.value = binaryCode[targetBitIndex]
    }

    // Track FPS
    frameCount.value++
    if (currentTime - fpsStartTime >= 1000) {
      actualFps.value = frameCount.value
      frameCount.value = 0
      fpsStartTime = currentTime
    }

    animationFrameId = requestAnimationFrame(animate)
  }

  /**
   * Stop transmission
   */
  const stop = () => {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
    isActive.value = false
    currentBitIndex.value = 0
    currentBit.value = ''
    binaryCode = ''
  }

  /**
   * Get current display color (black or white)
   */
  const getDisplayColor = () => {
    return currentBit.value === '1' ? '#FFFFFF' : '#000000'
  }

  onUnmounted(() => {
    stop()
  })

  return {
    isActive,
    currentBitIndex,
    currentBit,
    actualFps,
    start,
    stop,
    getDisplayColor
  }
}

