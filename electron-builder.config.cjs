/**
 * @file electron-builder.config.cjs
 * @description Defect-corrected, environment-driven electron-builder configuration.
 */

module.exports = {
  appId: 'com.nyx.app',
  productName: 'NYX',
  directories: {
    output: 'dist-desktop',
  },
  files: [
    'dist/**/*',
    'dist-server/**/*',
    'dist-electron/**/*',
    'package.json',
  ],
  extraResources: [
    {
      from: 'binaries/${os}/${arch}/',
      to: 'binaries',
      filter: ['**/*'],
    },
  ],
  asar: true,
  asarIntegrity: true,
  asarUnpack: [
    '**/binaries/**/*',
    '**/node_modules/sharp/**/*',
    '**/node_modules/@xenova/transformers/**/*',
  ],
  win: {
    target: 'nsis',
    icon: 'public/nyx-icon.ico',
    certificateFile: process.env.WIN_CERT_PATH || undefined,
    certificatePassword: process.env.WIN_CERT_PASSWORD || undefined,
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    shortcutName: 'NYX',
    runAfterFinish: true,
    installerIcon: 'public/nyx-icon.ico',
    uninstallerIcon: 'public/nyx-icon.ico',
    installerHeaderIcon: 'public/nyx-icon.ico',
  },
  mac: {
    hardenedRuntime: !!process.env.MAC_NOTARIZE_PASSWORD,
    entitlements: process.env.MAC_ENTITLEMENTS_PATH || undefined,
    entitlementsInherit: process.env.MAC_ENTITLEMENTS_PATH || undefined,
  },
};
