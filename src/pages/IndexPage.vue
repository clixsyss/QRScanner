<template>
  <q-page class="flex flex-center column q-pa-md">
    <div class="column q-gutter-lg" style="max-width: 500px; width: 100%;">
      <div class="text-h4 text-center q-mb-lg">Gate Access System</div>
      
      <q-card class="q-pa-md">
        <q-card-section>
          <div class="text-h6 q-mb-md">Binary Flash Signal System</div>
          
      <q-btn
        size="lg"
        color="primary"
            label="Transmitter"
            icon="flash_on"
            @click="$router.push('/transmitter')"
            class="full-width q-mb-md"
      />
          
      <q-btn
        size="lg"
        color="secondary"
            label="Receiver"
            icon="camera_alt"
            @click="$router.push('/receiver')"
            class="full-width q-mb-md"
      />
          
          <q-btn
            size="lg"
            color="accent"
            label="Dual Mode Test"
            icon="view_split"
            @click="$router.push('/dual-mode')"
            class="full-width"
          />
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup>
//
</script>
