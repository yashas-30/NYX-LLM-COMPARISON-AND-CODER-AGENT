import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

import { ThemeProvider } from './context/ThemeContext.tsx';
import { TokenUsageProvider } from './context/TokenUsageContext.tsx';
import { Analytics } from "@vercel/analytics/react";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <TokenUsageProvider>
        <App />
        <Analytics />
      </TokenUsageProvider>
    </ThemeProvider>
  </StrictMode>,
);
