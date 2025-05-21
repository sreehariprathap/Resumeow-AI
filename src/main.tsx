import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './web.css'
import App from './App.tsx'
import AuthWrapper from './AuthWrapper.tsx'
import { Toaster } from './components/ui/sonner'
import { AuthProvider } from './lib/authContext.tsx'

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
