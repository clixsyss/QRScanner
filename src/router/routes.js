const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('pages/IndexPage.vue') },
      { path: 'transmitter', component: () => import('pages/TransmitterPage.vue') },
      { path: 'receiver', component: () => import('pages/ReceiverPage.vue') },
      { path: 'dual-mode', component: () => import('pages/DualModeTest.vue') },
      // Legacy routes (keep for backward compatibility)
      { path: 'gate-access', component: () => import('pages/GateAccess.vue') },
      { path: 'qr-scanner', component: () => import('pages/QRScannerPage.vue') },
      { path: 'binary-flash', component: () => import('pages/BinaryFlashPage.vue') }
    ]
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue')
  }
]

export default routes
