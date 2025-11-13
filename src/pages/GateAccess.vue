<template>
  <q-page class="flex flex-center">
    <!-- Binary Signal Display Component (fullscreen overlay) -->
    <BinarySignalDisplay
      ref="binaryDisplayRef"
      :binary-code="currentBinaryCode || '00000000'"
      :bit-duration="200"
      :show-info="false"
      :sound-enabled="false"
      @signal-completed="onSignalCompleted"
    />

    <!-- Main UI (hidden during signal transmission) -->
    <div
      v-if="!isTransmitting"
      class="column q-gutter-lg"
      style="width: 300px;"
    >
      <q-btn
        color="primary"
        size="lg"
        icon="memory"
        label="Generate Binary Signal"
        class="q-py-md"
        :disable="isTransmitting"
        @click="generateRandomCode"
      />
    </div>
  </q-page>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { Notify } from 'quasar'
import BinarySignalDisplay from 'src/components/BinarySignalDisplay.vue'

// State
const isTransmitting = ref(false)
const currentBinaryCode = ref('')
const binaryDisplayRef = ref(null)
const lastGeneratedCode = ref('') // Store the last generated code to display

/**
 * Generate a random 8-bit binary code
 */
const generateRandomCode = () => {
  console.log('Generate button clicked')
  
  // Prevent multiple clicks
  if (isTransmitting.value) {
    return
  }
  
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += Math.random() > 0.5 ? '1' : '0'
  }
  
  console.log('Generated code:', code)
  lastGeneratedCode.value = code
  
  // Show the generated code before transmitting
  Notify.create({
    type: 'info',
    message: `Generated code: ${code}`,
    position: 'top',
    timeout: 2000,
    icon: 'memory'
  })
  
  transmitBinaryCode(code)
}

/**
 * Transmit binary code via signal display
 */
const transmitBinaryCode = async (code) => {
  if (!code || code.length === 0) {
    console.warn('No binary code provided')
    return
  }

  // Set the binary code first - this will create the component
  currentBinaryCode.value = code
  isTransmitting.value = true

  // Wait for Vue to create and mount the component
  await nextTick()
  
  // Additional small delay to ensure component is fully ready
  await new Promise(resolve => setTimeout(resolve, 100))

  // Start the signal display
  if (binaryDisplayRef.value) {
    console.log('Starting signal display with code:', code)
    try {
      await binaryDisplayRef.value.start()
    } catch (error) {
      console.error('Error starting signal display:', error)
      isTransmitting.value = false
      currentBinaryCode.value = ''
      Notify.create({
        type: 'negative',
        message: 'Failed to start signal display',
        position: 'top',
        timeout: 3000
      })
    }
  } else {
    console.error('BinaryDisplayRef is not available. Component may not be mounted yet.')
    isTransmitting.value = false
    currentBinaryCode.value = ''
    Notify.create({
      type: 'negative',
      message: 'Component not ready. Please try again.',
      position: 'top',
      timeout: 3000
    })
  }
}

/**
 * Handle signal completion
 */
const onSignalCompleted = () => {
  isTransmitting.value = false
  
  Notify.create({
    type: 'positive',
    message: `Signal generated successfully. Code: ${lastGeneratedCode.value}`,
    position: 'top',
    timeout: 3000
  })
  
  currentBinaryCode.value = ''
}
</script>
