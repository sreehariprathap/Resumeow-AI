import { useAuth } from "@/lib/authContext";
import { Button } from "./ui/button";

export const WebHeader = () => {
  const { currentUser, logout } = useAuth();

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
            <img src="/Resumeow-d.png" className="w-44" />
            <span className="text-sm font-normal">prompter</span>
        </div>
        <nav className="nav-links">
          {currentUser && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Hello, {currentUser.displayName || currentUser.email}
              </span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Log Out
              </Button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};
