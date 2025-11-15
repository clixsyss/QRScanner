<template>
  <div
    v-if="isActive"
    ref="displayRef"
    class="high-speed-transmitter fullscreen"
    :style="displayStyle"
  />
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'

const props = defineProps({
  /**
   * Binary code string (e.g., "01011010")
   */
  binaryCode: {
    type: String,
    required: true,
    validator: (value) => !value || /^[01]+$/.test(value)
  },
  /**
   * Target frame rate (fps) - minimum 30
   */
  targetFps: {
    type: Number,
    default: 30,
    validator: (value) => value >= 30
  },
  /**
   * Whether to show debug info
   */
  showInfo: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['signalCompleted', 'signalStarted', 'frameRate'])

const isActive = ref(false)
const currentBitIndex = ref(-1)
const currentBit = ref('')
const displayRef = ref(null)
const displayStyle = computed(() => ({
  backgroundColor: currentBit.value === '0' ? '#000000' : '#FFFFFF',
  transition: 'none' // No transition for instant color changes
}))

let animationFrameId = null
let frameCount = 0
let fpsStartTime = 0
let actualFps = 0
let bitStartTime = 0
let frameDuration = 0

/**
 * Detect device refresh rate and adapt
 */
const detectFrameRate = () => {
  return new Promise((resolve) => {
    let frames = 0
    let lastTime = performance.now()
    
    const measure = (currentTime) => {
      frames++
      if (currentTime >= lastTime + 1000) {
        const fps = Math.round((frames * 1000) / (currentTime - lastTime))
        resolve(Math.max(fps, 30)) // Minimum 30 fps
      } else {
        requestAnimationFrame(measure)
      }
    }
    
    requestAnimationFrame(measure)
  })
}

/**
 * Start high-speed transmission
 */
const start = async () => {
  if (isActive.value) {
    stop()
  }

  if (!props.binaryCode || props.binaryCode.length === 0) {
    console.warn('No binary code provided')
    return
  }

  // Detect and adapt to device frame rate
  const deviceFps = await detectFrameRate()
  const targetFps = Math.max(props.targetFps, deviceFps)
  frameDuration = 1000 / targetFps // Duration per frame in ms
  
  // Calculate frames per bit (ensure at least 1 frame per bit)
  const framesPerBit = Math.max(1, Math.floor(targetFps / 30)) // At least 30 bits/sec
  
  console.log(`Device FPS: ${deviceFps}, Target FPS: ${targetFps}, Frames per bit: ${framesPerBit}`)
  
  isActive.value = true
  currentBitIndex.value = -1
  currentBit.value = ''
  frameCount = 0
  fpsStartTime = performance.now()
  
  emit('signalStarted', props.binaryCode)
  emit('frameRate', targetFps)

  // Start animation loop
  bitStartTime = performance.now()
  animate()
}

/**
 * Animation loop using requestAnimationFrame for smooth 30+ fps
 */
const animate = () => {
  if (!isActive.value) return

  const currentTime = performance.now()
  const elapsed = currentTime - bitStartTime
  
  // Calculate which bit we should be displaying
  const bitDuration = frameDuration * Math.max(1, Math.floor(props.targetFps / 30))
  const targetBitIndex = Math.floor(elapsed / bitDuration)
  
  if (targetBitIndex !== currentBitIndex.value && targetBitIndex < props.binaryCode.length) {
    currentBitIndex.value = targetBitIndex
    currentBit.value = props.binaryCode[targetBitIndex]
  }
  
  // Track actual FPS
  frameCount++
  if (currentTime - fpsStartTime >= 1000) {
    actualFps = frameCount
    frameCount = 0
    fpsStartTime = currentTime
    if (props.showInfo) {
      console.log(`Actual FPS: ${actualFps}, Bit: ${currentBitIndex.value + 1}/${props.binaryCode.length}`)
    }
  }
  
  // Check if transmission is complete
  if (targetBitIndex >= props.binaryCode.length) {
    // Small delay to ensure last bit is displayed
    setTimeout(() => {
      emit('signalCompleted', props.binaryCode)
      stop()
    }, frameDuration)
    return
  }
  
  // Continue animation
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
  currentBitIndex.value = -1
  currentBit.value = ''
  frameCount = 0
}

// Cleanup
onUnmounted(() => {
  stop()
})

// Expose methods
defineExpose({
  start,
  stop,
  getActualFps: () => actualFps
})
</script>

<style scoped>
.high-speed-transmitter {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9997; /* Below camera (9998) so it shows through */
  user-select: none;
  -webkit-user-select: none;
  cursor: none;
  pointer-events: none; /* Allow clicks to pass through to camera */
  will-change: background-color; /* Optimize for frequent color changes */
  backface-visibility: hidden; /* Improve performance */
  transform: translateZ(0); /* Force hardware acceleration */
}
</style>

