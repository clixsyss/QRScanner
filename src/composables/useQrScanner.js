import { ref, onUnmounted } from 'vue'
import { Html5Qrcode } from 'html5-qrcode'

/**
 * Composable for QR code scanning functionality
 * Handles camera access, QR code scanning, and cleanup
 */
export function useQrScanner() {
  const cameras = ref([])
  const cameraOptions = ref([])
  const selectedCameraId = ref(null)
  const isLoadingCameras = ref(false)
  const isStarting = ref(false)
  const isScanning = ref(false)
  const scannerError = ref('')
  const scannedData = ref('')
  let html5QrCode = null

  /**
   * Load available cameras from the device
   */
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

      // Prefer back/rear camera for mobile devices
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

  /**
   * Ensure scanner is properly stopped and cleaned up
   */
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

  /**
   * Check if error is a constraint error (camera constraints issue)
   */
  const isConstraintError = (error) => {
    const name = error?.name || ''
    const message = error?.message?.toLowerCase?.() || ''
    return name === 'OverconstrainedError' || message.includes('overconstrained') || message.includes('constraint')
  }

  /**
   * Start scanner with specific configuration
   */
  const startWithConfig = async (cameraId, config, onScanSuccess) => {
    await ensureScannerStopped()
    html5QrCode = new Html5Qrcode('qr-reader')

    await html5QrCode.start(
      cameraId,
      config,
      (decodedText) => {
        scannedData.value = decodedText
        if (onScanSuccess) {
          onScanSuccess(decodedText)
        }
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

  /**
   * Start the QR scanner
   */
  const startScanner = async (onScanSuccess) => {
    const cameraId = selectedCameraId.value
    if (!cameraId) {
      throw new Error('No camera selected')
    }

    const preferredSize = Math.min(320, window.innerWidth - 48)
    const primaryConfig = {
      qrbox: preferredSize > 200 ? preferredSize : 200
    }

    try {
      await startWithConfig(cameraId, primaryConfig, onScanSuccess)
    } catch (error) {
      if (isConstraintError(error)) {
        console.warn('Primary camera constraints failed, retrying with defaults:', error)
        await startWithConfig(cameraId, undefined, onScanSuccess)
      } else {
        throw error
      }
    }
  }

  /**
   * Prepare and start the scanner
   */
  const prepareScanner = async (onScanSuccess) => {
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

    try {
      await startScanner(onScanSuccess)
      isScanning.value = true
    } catch (error) {
      console.error('Unable to start scanner:', error)
      scannerError.value = error?.message || error?.name || 'Failed to start the camera.'
      await ensureScannerStopped()
      throw error
    } finally {
      isStarting.value = false
    }
  }

  /**
   * Stop the scanner
   */
  const stopScanner = async () => {
    await ensureScannerStopped()
    isScanning.value = false
  }

  /**
   * Extract binary code from scanned QR data
   * Supports both direct binary strings and gate IDs/tokens
   * @param {string} scannedData - The scanned QR code data
   * @param {number} preferredLength - Preferred binary code length (default: 8)
   * @returns {string|null} - Binary code string or null if extraction fails
   */
  const extractBinaryCode = (scannedData, preferredLength = 8) => {
    if (!scannedData) return null

    // Check if it's already a binary string (any length)
    const binaryMatch = scannedData.match(/^[01]+$/)
    if (binaryMatch) {
      return binaryMatch[0]
    }

    // If it's a gate ID or token, convert to binary
    // Simple hash-based conversion for demonstration
    // In production, you might want a more sophisticated encoding
    let hash = 0
    for (let i = 0; i < scannedData.length; i++) {
      const char = scannedData.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    
    // Convert to binary with preferred length (pad or truncate as needed)
    const binary = Math.abs(hash).toString(2).padStart(preferredLength, '0').slice(-preferredLength)
    return binary
  }

  // Cleanup on unmount
  onUnmounted(() => {
    stopScanner()
  })

  return {
    cameras,
    cameraOptions,
    selectedCameraId,
    isLoadingCameras,
    isStarting,
    isScanning,
    scannerError,
    scannedData,
    loadCameras,
    prepareScanner,
    stopScanner,
    extractBinaryCode
  }
}

