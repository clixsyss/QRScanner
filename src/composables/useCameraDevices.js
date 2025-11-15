import { ref, onMounted } from 'vue'

/**
 * Composable for loading and managing camera devices
 */
export function useCameraDevices() {
  const cameraOptions = ref([])
  const selectedCameraId = ref(null)
  const isLoadingCameras = ref(false)

  /**
   * Load available camera devices
   */
  const loadCameras = async () => {
    isLoadingCameras.value = true

    try {
      // Request permission first
      await navigator.mediaDevices.getUserMedia({ video: true })
      
      // Enumerate devices
      const devices = await navigator.mediaDevices.enumerateDevices()
      
      // Filter video input devices
      const videoDevices = devices.filter(device => device.kind === 'videoinput')

      if (videoDevices.length === 0) {
        cameraOptions.value = []
        selectedCameraId.value = null
        return
      }

      // Map to options format
      cameraOptions.value = videoDevices.map((device, index) => ({
        label: device.label || `Camera ${index + 1}`,
        value: device.deviceId
      }))

      // Prefer back/rear camera for mobile devices
      const preferredDevice = videoDevices.find((device) => {
        const label = device.label?.toLowerCase() || ''
        return label.includes('back') || label.includes('rear') || label.includes('environment')
      })

      selectedCameraId.value = preferredDevice?.deviceId || cameraOptions.value[0]?.value || null
    } catch (error) {
      console.error('Failed to load cameras:', error)
      cameraOptions.value = []
      selectedCameraId.value = null
    } finally {
      isLoadingCameras.value = false
    }
  }

  // Load cameras on mount
  onMounted(() => {
    loadCameras()
  })

  return {
    cameraOptions,
    selectedCameraId,
    isLoadingCameras,
    loadCameras
  }
}

