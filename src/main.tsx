import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './extension.css'
import App from './App.tsx'
import AuthWrapper from './AuthWrapper.tsx'
import { Toaster } from './components/ui/sonner'
import { AuthProvider } from './lib/authContext.tsx'
import { isExtensionContext } from './lib/firebase.ts'

// Add extension-specific class to body if running in extension
if (isExtensionContext()) {
  document.body.classList.add('extension-popup');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <AuthWrapper>
        <App />
      </AuthWrapper>
      <Toaster />
    </AuthProvider>
  </StrictMode>,
)
