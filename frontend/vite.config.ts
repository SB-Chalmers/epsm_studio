// SPDX-License-Identifier: MIT
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

export default defineConfig({
  plugins: [react(), {
    name: 'canonical-distribution-notices',
    generateBundle() {
      const notices = {
        'STUDIO-LICENSE.txt': '../LICENSE.md',
        'INTER-OFL.txt': '../design/pocket-cad/fonts/INTER-OFL.txt',
        'IBM-PLEX-OFL.txt': '../design/pocket-cad/fonts/IBM-PLEX-OFL.txt',
        'POCKET-CAD-ICONS-LICENSE.txt': '../design/pocket-cad/icons/LICENSE',
        'FONT-PROVENANCE.json': '../design/pocket-cad/fonts/manifest.json',
        'VIEWER-LICENSE.txt': './node_modules/epsm_viewer/LICENSE',
        'VIEWER-NOTICES.md': './node_modules/epsm_viewer/THIRD_PARTY_NOTICES.md',
        'THREE-LICENSE.txt': './node_modules/epsm_viewer/dist/standalone/THREE_LICENSE',
        'VIEWER-PROVENANCE.json': './vendor/epsm_viewer-0.1.0.provenance.json',
      };
      for (const [name, source] of Object.entries(notices)) this.emitFile({ type: 'asset', fileName: `licenses/${name}`, source: readFileSync(new URL(source, import.meta.url), 'utf8') });
    },
  }],
  server: { fs: { allow: [fileURLToPath(new URL('..', import.meta.url))] } },
});
