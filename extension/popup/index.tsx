import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '../src/popup/App';
import '../src/popup/index.css';

const root = document.getElementById('root');
if (root) createRoot(root).render(<App />);
