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
import { TokenProvider } from './lib/tokenContext.tsx'
import { LazyModeProvider } from './lib/lazyModeContext.tsx'
import { AdminPage } from './pages/AdminPage.tsx'
import { ResumeGeneratorPage } from './pages/ResumeGeneratorPage.tsx'
import { JDMatcherPage } from './pages/JDMatcherPage.tsx'
import { ResumeScoringPage } from './pages/ResumeScoringPage.tsx'
import { LazyModePage } from './pages/LazyModePage.tsx'
import { LazyModeSettingsModal } from './components/LazyModeSettingsModal.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <BrowserRouter>
          <AuthProvider>
            <AIProviderProvider>
              <TokenProvider>
                <OnboardingProvider>
                  <LazyModeProvider>
                    <AuthWrapper>
                      <Routes>
                        <Route path="/" element={<App />} />
                        <Route path="/tracker" element={<ApplicationTracker />} />
                        <Route path="/admin" element={<AdminPage />} />
                        <Route path="/resume" element={<ResumeGeneratorPage />} />
                        <Route path="/jd-matcher" element={<JDMatcherPage />} />
                        <Route path="/resume-score" element={<ResumeScoringPage />} />
                        <Route path="/lazy" element={<LazyModePage />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                      </Routes>
                    </AuthWrapper>
                    <LazyModeSettingsModal />
                    <Toaster />
                  </LazyModeProvider>
                </OnboardingProvider>
              </TokenProvider>
            </AIProviderProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
)
