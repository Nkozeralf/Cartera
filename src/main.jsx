import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initializeFirebase } from './infra/firebase.config.js';
import App from './App.jsx';

// FASE 2: Inicializar Firebase antes de renderizar la app
initializeFirebase();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);


