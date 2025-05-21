import { useState } from "react";
import { signInWithGoogle, logOut } from "@/lib/firebase";
import { useAuth } from "@/lib/authContext";
import { Button } from "./ui/button";
import { LogIn, LogOut, User } from "lucide-react";
import { toast } from "sonner";

export function GoogleAuthButton() {
  const [isLoading, setIsLoading] = useState(false);
  const { currentUser, isAuthenticated } = useAuth();  const handleSignIn = async () => {
    try {
      setIsLoading(true);
      const user = await signInWithGoogle();
      
      // If we got a user back, it means the popup worked
      if (user) {
        toast.success("Successfully signed in!");
        setIsLoading(false);
      }
      // If user is null, a redirect is happening 
      // The toast will be shown by AuthProvider after redirect completes
    } catch (error) {
      console.error("Error signing in:", error);
      toast.error("Failed to sign in. Please try again.");
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setIsLoading(true);
      await logOut();
      toast.success("Successfully signed out!");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to sign out. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {isAuthenticated ? (
        <>
          <div className="flex items-center gap-2 rounded-full bg-secondary px-2 py-1 text-sm">
            <User className="h-4 w-4" />
            <span className="max-w-[100px] overflow-hidden text-ellipsis whitespace-nowrap">
              {currentUser?.displayName || currentUser?.email}
            </span>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleSignOut}
            disabled={isLoading}
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </>
      ) : (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleSignIn}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <LogIn className="h-4 w-4" />
          Sign In
        </Button>
      )}
    </div>
  );
}
