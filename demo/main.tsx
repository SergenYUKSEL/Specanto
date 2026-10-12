import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/archivo';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import { App } from './App';
import '../src/styles/reference.css';
import './site.css';

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
