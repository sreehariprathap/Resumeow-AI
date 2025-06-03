import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './web.css'
import App from './App.tsx'
import AuthWrapper from './AuthWrapper.tsx'
import { Toaster } from './components/ui/sonner'
import { AuthProvider } from './lib/authContext.tsx'
import { AIProviderProvider } from './lib/aiProviderContext.tsx'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import PrivacyPolicy from './components/PrivacyPolicy.tsx'
// import { TestPage } from './components/TestPage.tsx'
import { ThemeProvider } from './components/theme-provider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <BrowserRouter>        <AuthProvider>
          <AIProviderProvider>
            <AuthWrapper>
              <Routes>
                <Route path="/" element={<App />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                {/* <Route path="/test" element={<TestPage />} /> */}
              </Routes>
            </AuthWrapper>
            <Toaster />
          </AIProviderProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
)
