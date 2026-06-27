import { useEffect } from "react";
import { useAuth } from "@/lib/authContext";
import { initUserProfile } from "@/lib/firebaseWeb";
import { AuthScreen } from "./components/AuthScreen";
import { WebHeader } from "./components/WebHeader";
import { WebFooter } from "./components/WebFooter";

interface AuthWrapperProps {
  children: React.ReactNode;
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const { isAuthenticated, isLoading, currentUser } = useAuth();

  useEffect(() => {
    if (currentUser) {
      void initUserProfile(
        currentUser.uid,
        currentUser.email ?? '',
        currentUser.displayName ?? ''
      );
    }
  }, [currentUser]);

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
