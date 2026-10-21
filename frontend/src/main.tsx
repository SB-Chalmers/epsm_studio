// SPDX-License-Identifier: MIT
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import '../../design/pocket-cad/tokens.css';
import '../../design/pocket-cad/theme.css';
import './style.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="epsm-pocket-cad">
    <App />
      </div>
  </StrictMode>,
);
