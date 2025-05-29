import { useAuth } from "@/lib/authContext";
import { Button } from "./ui/button";
import { ModeToggle } from "./mode-toggle";
import { useTheme } from "./theme-provider";

export const WebHeader = () => {
  const { currentUser, logout } = useAuth();
  const { theme } = useTheme();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };
  return (
    <header className="web-header">
      <div className="container flex justify-between items-center">        
        <div className="flex gap-0 flex-col">            
          <img 
            src={theme === 'dark' ? "/Resumeow..png" : "/Resumeow-d.png"} 
            className="w-32 lg:w-44" 
            alt="Resumeow logo"
          />
          <span className="text-sm font-normal text-foreground">prompter</span>
        </div>
          <div className="flex flex-col items-end gap-2">
          <nav className="nav-links">
            <div className="flex items-center gap-4">
              <ModeToggle />
              {currentUser && (
                <>
                  <span className="text-sm hidden lg:flex text-muted-foreground">
                    Hello, {currentUser.displayName || currentUser.email}
                  </span>
                  <Button variant="outline" size="sm" onClick={handleLogout}>
                    Log Out
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
};
