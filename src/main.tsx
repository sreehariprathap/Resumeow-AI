import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './web.css'
import App from './App.tsx'
import AuthWrapper from './AuthWrapper.tsx'
import { Toaster } from './components/ui/sonner'
import { AuthProvider } from './lib/authContext.tsx'
import { AIProviderProvider } from './lib/aiProviderContext.tsx'
import { OnboardingProvider } from './lib/onboardingContext.tsx'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ApplicationTracker } from './components/ApplicationTracker.tsx'
import { ThemeProvider } from './components/theme-provider.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <BrowserRouter>
          <AuthProvider>
            <AIProviderProvider>
              <OnboardingProvider>
                <AuthWrapper>
                  <Routes>
                    <Route path="/" element={<App />} />
                    <Route path="/tracker" element={<ApplicationTracker />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </AuthWrapper>
                <Toaster />
              </OnboardingProvider>
            </AIProviderProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
)
