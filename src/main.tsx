import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './web.css'
import App from './App.tsx'
import AuthWrapper from './AuthWrapper.tsx'
import { Toaster } from './components/ui/sonner'
import { AuthProvider } from './lib/authContext.tsx'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import PrivacyPolicy from './components/PrivacyPolicy.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AuthWrapper>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
          </Routes>
        </AuthWrapper>
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
