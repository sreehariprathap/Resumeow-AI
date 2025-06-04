import { useAuth } from "@/lib/authContext";
import { AuthScreen } from "./components/AuthScreen";
import { WebHeader } from "./components/WebHeader";
import { WebFooter } from "./components/WebFooter";

interface AuthWrapperProps {
  children: React.ReactNode;
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const { isAuthenticated, isLoading } = useAuth();
    // Check if the current path is the privacy policy page or test page
  const isPrivacyPage = "https://github.com/sreehariprathap/Resumeow-AI/blob/awesome-resumeow/privacy-policy.md"
  // If it's the privacy policy page or test page, render it without authentication check
  if (isPrivacyPage) {
    return (
      <>
        <WebHeader />
        <div className="container py-8">{children}</div>
        <WebFooter />
      </>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="container p-4 flex items-center justify-center" style={{ height: "100vh" }}>
        <p className="text-center text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // If not authenticated, show the auth screen
  if (!isAuthenticated) {
    return (
      <div className="auth-wrapper container p-4">
        <AuthScreen />
      </div>
    );
  }

  // Otherwise render the app content with web header and footer
  return (
    <>
      <WebHeader />
      <div className="container py-8">{children}</div>
      <WebFooter />
    </>
  );
}
