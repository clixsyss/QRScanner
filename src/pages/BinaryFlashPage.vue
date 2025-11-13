<template>
  <q-page class="flex flex-center column" :style="pageStyle">
    <div v-if="!isFlashing" class="column q-gutter-md q-pa-md" style="width: 300px;">
      <q-btn
        flat
        icon="arrow_back"
        label="Back"
        @click="$router.push('/')"
        color="primary"
      />
      
      <div class="text-h5 text-center">Binary Flash</div>
      
      <q-input
        v-model="binaryCode"
        label="Enter 8-bit binary code"
        placeholder="01010110"
        maxlength="8"
        outlined
        :rules="[validateBinary]"
      />
      
      <q-btn
        color="primary"
        label="Start Flash"
        icon="flash_on"
        size="lg"
        @click="startFlashing"
        :disable="!isValidBinary"
        class="q-py-md"
      />
      
      <div class="text-caption text-center text-grey-7">
        Enter 0s and 1s only. Each digit will flash as black (0) or white (1).
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const binaryCode = ref('')
const isFlashing = ref(false)
const currentColor = ref('')

const pageStyle = computed(() => {
  if (isFlashing.value) {
    return {
      backgroundColor: currentColor.value,
      transition: 'background-color 0.1s'
    }
  }
  return {}
})

const validateBinary = (val) => {
  if (!val) return 'Please enter a binary code'
  if (val.length !== 8) return 'Must be exactly 8 bits'
  if (!/^[01]+$/.test(val)) return 'Only 0s and 1s allowed'
  return true
}

const isValidBinary = computed(() => {
  return binaryCode.value.length === 8 && /^[01]+$/.test(binaryCode.value)
})

const startFlashing = async () => {
  if (!isValidBinary.value) return
  
  isFlashing.value = true
  
  for (let i = 0; i < binaryCode.value.length; i++) {
    const digit = binaryCode.value[i]
    
    // Display the bit color
    currentColor.value = digit === '0' ? '#000000' : '#FFFFFF'
    
    // Display the bit for 400ms
    await new Promise(resolve => setTimeout(resolve, 400))
    
    // Add a gray separator for 100ms between bits to make consecutive same bits distinguishable
    // Only add separator if not the last bit
    if (i < binaryCode.value.length - 1) {
      currentColor.value = '#808080'
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }
  
  // Flash complete, go back to home
  isFlashing.value = false
  currentColor.value = ''
  router.push('/')
}
</script>

<style scoped>
.q-page {
  min-height: 100vh;
}
</style>

