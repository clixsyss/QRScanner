<template>
  <div
    v-if="isActive"
    class="binary-signal-display fullscreen"
    :style="displayStyle"
    @click="handleClick"
  >
    <div v-if="showInfo" class="signal-info">
      <div class="text-h6">{{ currentBitIndex + 1 }} / {{ binaryCode.length }}</div>
      <div class="text-body2">Bit: {{ currentBit }}</div>
      <div class="text-caption">{{ binaryCode }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'

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
   * Duration in milliseconds for each bit display
   */
  bitDuration: {
    type: Number,
    default: 200
  },
  /**
   * Whether to show debug info during transmission
   */
  showInfo: {
    type: Boolean,
    default: false
  },
  /**
   * Whether to play sound feedback for each bit
   */
  soundEnabled: {
    type: Boolean,
    default: false
  },
  /**
   * Auto-start when binaryCode changes
   */
  autoStart: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['signalCompleted', 'signalStarted'])

const isActive = ref(false)
const currentBitIndex = ref(-1)
const currentBit = ref('')
let animationTimeout = null
let audioContext = null
let oscillator = null

/**
 * Generate a short beep sound for bit feedback
 */
const playBeep = () => {
  if (!props.soundEnabled) return

  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)()
    }

    oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.value = currentBit.value === '1' ? 800 : 400 // Higher pitch for 1, lower for 0
    oscillator.type = 'sine'

    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.05)
  } catch (error) {
    console.warn('Could not play sound:', error)
  }
}

/**
 * Display style based on current bit
 */
const displayStyle = computed(() => {
  if (!isActive.value || currentBitIndex.value < 0) {
    return { backgroundColor: '#000000' }
  }

  const backgroundColor = currentBit.value === '0' ? '#000000' : '#FFFFFF'
  return {
    backgroundColor,
    transition: `background-color ${props.bitDuration * 0.1}ms ease-in-out`
  }
})

/**
 * Start displaying the binary signal
 */
const start = async () => {
  if (isActive.value) {
    stop()
  }

  if (!props.binaryCode || props.binaryCode.length === 0) {
    console.warn('No binary code provided')
    return
  }

  isActive.value = true
  currentBitIndex.value = -1
  emit('signalStarted', props.binaryCode)

  // Small delay before starting
  await new Promise(resolve => setTimeout(resolve, 100))

  // Display each bit sequentially
  for (let i = 0; i < props.binaryCode.length; i++) {
    currentBitIndex.value = i
    currentBit.value = props.binaryCode[i]

    // Play sound feedback if enabled
    playBeep()

    // Wait for bit duration
    await new Promise(resolve => {
      animationTimeout = setTimeout(resolve, props.bitDuration)
    })
  }

  // Signal complete
  emit('signalCompleted', props.binaryCode)
  
  // Small delay before resetting
  await new Promise(resolve => setTimeout(resolve, 100))
  
  stop()
}

/**
 * Stop the signal display
 */
const stop = () => {
  if (animationTimeout) {
    clearTimeout(animationTimeout)
    animationTimeout = null
  }

  if (oscillator) {
    try {
      oscillator.stop()
    } catch {
      // Ignore errors when stopping oscillator
    }
    oscillator = null
  }

  isActive.value = false
  currentBitIndex.value = -1
  currentBit.value = ''
}

/**
 * Handle click to stop early (optional)
 */
const handleClick = () => {
  // Allow clicking to stop early if needed
  // stop()
}

/**
 * Watch for auto-start
 */
watch(() => props.binaryCode, (newCode) => {
  if (props.autoStart && newCode && newCode.length > 0) {
    start()
  }
}, { immediate: false })

/**
 * Watch for binaryCode changes to validate
 */
watch(() => props.binaryCode, (newCode) => {
  if (newCode && !/^[01]+$/.test(newCode)) {
    console.warn('Invalid binary code:', newCode)
  }
})

// Cleanup on unmount
onUnmounted(() => {
  stop()
  if (audioContext) {
    audioContext.close().catch(() => {})
  }
})

// Expose methods for parent component
defineExpose({
  start,
  stop
})
</script>

<style scoped>
.binary-signal-display {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
  -webkit-user-select: none;
  cursor: none;
}

.signal-info {
  position: absolute;
  top: 20px;
  left: 20px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 16px;
  border-radius: 8px;
  font-family: monospace;
  z-index: 10000;
}

.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
</style>

