import { useAuth } from "@/lib/authContext";
import { ExtensionAuthScreen } from "./components/ExtensionAuthScreen";

interface ExtensionAuthWrapperProps {
  children: React.ReactNode;
}

export default function ExtensionAuthWrapper({ children }: ExtensionAuthWrapperProps) {
  const { isAuthenticated, isLoading } = useAuth();
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="container p-4 flex items-center justify-center min-h-96">
        <p className="text-center text-muted-foreground">Loading...</p>
      </div>
    );
  }
  // If not authenticated, show the auth screen
  if (!isAuthenticated) {
    return (
      <div className="auth-wrapper container p-4">
        <ExtensionAuthScreen />
      </div>
    );
  }

  // Otherwise render the app content (no header/footer for extension)
  return (
    <div className="container p-4">
      {children}
    </div>
  );
}
