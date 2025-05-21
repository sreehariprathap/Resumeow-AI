import { useAuth } from "@/lib/authContext";
import { AuthScreen } from "./components/AuthScreen";
import { isExtensionContext } from "./lib/firebase";
import { useEffect } from "react";
import { extensionLogger, checkFirebaseAccess } from "@/lib/extensionUtils";

interface AuthWrapperProps {
  children: React.ReactNode;
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const inExtension = isExtensionContext();

  // Run compatibility checks for extension context
  useEffect(() => {
    if (inExtension) {
      extensionLogger("AuthWrapper mounted in extension context");
      // Check Firebase API access in extension context
      checkFirebaseAccess().then((results) => {
        if (!results.googleAPIs) {
          extensionLogger("Warning: Google APIs may not be accessible. Check CSP settings.");
        }
      });
    }
  }, [inExtension]);

  // Show loading state
  if (isLoading) {
    return (
      <div className={`${inExtension ? "w-full" : "container"} p-4 flex items-center justify-center`} style={{ height: inExtension ? "auto" : "100vh", maxHeight: inExtension ? "600px" : "none" }}>
        <p className="text-center text-muted-foreground">Loading...</p>
      </div>
    );
  }
  // If not authenticated, show the auth screen
  if (!isAuthenticated) {
    return (
      <div className={`auth-wrapper ${inExtension ? "w-full overflow-auto" : "container"} p-4`} style={{ maxHeight: inExtension ? "600px" : "none" }}>
        <AuthScreen />
      </div>
    );
  }

  // Otherwise render the app content
  return <>{children}</>;
}
