<template>
  <q-page class="flex flex-center column q-pa-md">
    <!-- High-Speed Binary Transmitter -->
    <HighSpeedBinaryTransmitter
      ref="transmitterRef"
      :binary-code="currentBinaryCode || '00000000'"
      :target-fps="targetFps"
      :show-info="false"
      @signal-completed="onTransmissionCompleted"
      @signal-started="onTransmissionStarted"
      @frame-rate="onFrameRateDetected"
    />

    <!-- Main UI -->
    <div v-if="!isTransmitting" class="column q-gutter-md" style="max-width: 400px; width: 100%;">
      <q-btn flat icon="arrow_back" label="Back" @click="goBack" />
      
      <div class="text-h5 text-center">Binary Signal Transmitter</div>
      
      <q-input
        v-model.number="codeLength"
        type="number"
        label="Code Length (bits)"
        :min="4"
        :max="32"
        outlined
      />

      <q-slider
        v-model="targetFps"
        :min="30"
        :max="120"
        label
        label-always
        :label-value="`${targetFps} fps`"
        color="primary"
      />

      <q-btn
        color="primary"
        size="lg"
        icon="play_arrow"
        label="Start Transmission"
        class="full-width"
        @click="startTransmission"
      />
    </div>

    <!-- Status Overlay -->
    <div v-if="isTransmitting" class="status-overlay">
      <q-card style="min-width: 300px;">
        <q-card-section>
          <div class="text-h6 q-mb-md">Transmitting Signal</div>
          
          <div class="q-mb-md">
            <div class="text-caption text-grey-7">Binary Code</div>
            <div class="text-h5 text-primary text-weight-bold">{{ lastGeneratedCode }}</div>
          </div>
          
          <div class="row q-gutter-md q-mb-md">
            <div class="col">
              <div class="text-caption text-grey-7">Frame Rate</div>
              <div class="text-body1 text-weight-bold">{{ actualFrameRate }} fps</div>
            </div>
            <div class="col">
              <div class="text-caption text-grey-7">Target</div>
              <div class="text-body1 text-weight-bold">{{ targetFps }} fps</div>
            </div>
          </div>

          <q-btn
            color="negative"
            label="Stop"
            icon="stop"
            class="full-width"
            @click="stopTransmission"
          />
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { Notify } from 'quasar'
import HighSpeedBinaryTransmitter from 'src/components/HighSpeedBinaryTransmitter.vue'

const router = useRouter()

const isTransmitting = ref(false)
const currentBinaryCode = ref('')
const transmitterRef = ref(null)
const lastGeneratedCode = ref('')
const targetFps = ref(60)
const actualFrameRate = ref(0)
const codeLength = ref(8)

const generateRandomCode = (length) => {
  let code = ''
  for (let i = 0; i < length; i++) {
    code += Math.random() > 0.5 ? '1' : '0'
  }
  return code
}

const startTransmission = async () => {
  if (isTransmitting.value) return

  const code = generateRandomCode(codeLength.value)
  lastGeneratedCode.value = code
  currentBinaryCode.value = code

  await nextTick()
  await new Promise(resolve => setTimeout(resolve, 100))

  if (transmitterRef.value) {
    try {
      isTransmitting.value = true
      await transmitterRef.value.start()
    } catch (error) {
      console.error('Error starting transmitter:', error)
      isTransmitting.value = false
      Notify.create({
        type: 'negative',
        message: 'Failed to start transmission',
        position: 'top',
        timeout: 3000
      })
    }
  }
}

const stopTransmission = () => {
  if (transmitterRef.value) {
    transmitterRef.value.stop()
  }
  isTransmitting.value = false
  currentBinaryCode.value = ''
}

const onTransmissionCompleted = () => {
  isTransmitting.value = false
  currentBinaryCode.value = ''
  Notify.create({
    type: 'positive',
    message: 'Signal transmitted successfully!',
    position: 'top',
    timeout: 3000
  })
}

const onTransmissionStarted = () => {
  // Transmission started
}

const onFrameRateDetected = (fps) => {
  actualFrameRate.value = Math.round(fps)
}

const goBack = () => {
  if (isTransmitting.value) {
    stopTransmission()
  }
  router.push('/')
}
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
