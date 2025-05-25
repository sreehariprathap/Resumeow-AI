import { useAuth } from "@/lib/authContext";
import { AuthScreen } from "./components/AuthScreen";
import { WebHeader } from "./components/WebHeader";
import { WebFooter } from "./components/WebFooter";
import { useLocation } from "react-router-dom";

interface AuthWrapperProps {
  children: React.ReactNode;
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  
  // Check if the current path is the privacy policy page
  const isPrivacyPage = location.pathname === "/privacy";
  
  // If it's the privacy policy page, render it without authentication check
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
