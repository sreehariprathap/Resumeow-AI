import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './extension.css'
import App from './App.tsx'
import ExtensionAuthWrapper from './ExtensionAuthWrapper.tsx'
import { Toaster } from './components/ui/sonner'
import { AuthProvider } from './lib/authContext.tsx'
import { AIProviderProvider } from './lib/aiProviderContext.tsx'
import { ThemeProvider } from './components/theme-provider.tsx'

// Chrome extension entry point - no router needed
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <AuthProvider>
        <AIProviderProvider>
          <ExtensionAuthWrapper>
            <App />
          </ExtensionAuthWrapper>
          <Toaster />
        </AIProviderProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
)
