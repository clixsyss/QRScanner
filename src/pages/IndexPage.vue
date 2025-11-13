<template>
  <q-page class="flex flex-center">
    <div class="column q-gutter-lg" style="width: 300px;">
      <q-btn
        size="lg"
        color="primary"
        label="QR Code Scanner"
        icon="qr_code_scanner"
        @click="$router.push('/qr-scanner')"
        class="q-py-md"
      />
      <q-btn
        size="lg"
        color="secondary"
        label="Binary Flash"
        icon="looks_one"
        @click="$router.push('/binary-flash')"
        class="q-py-md"
      />
    </div>
  </q-page>
</template>

<script setup>
//
</script>
