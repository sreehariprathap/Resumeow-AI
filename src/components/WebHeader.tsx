import { useAuth } from "@/lib/authContext";
import { useTokens } from "@/lib/tokenContext";
import { useOnboarding } from "@/lib/onboardingContext";
import { Button } from "./ui/button";
import { ModeToggle } from "./mode-toggle";
import { useTheme } from "./theme-provider";
import { Link, useLocation } from "react-router-dom";
import { LayoutList, ShieldCheck, FileText, Target, BarChart3 } from "lucide-react";
import { TokenBadge } from "./TokenBadge";

export const WebHeader = () => {
  const { currentUser, logout } = useAuth();
  const { isAdmin } = useTokens();
  const { hasCompletedOnboarding } = useOnboarding();
  const { theme } = useTheme();
  const { pathname } = useLocation();

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
                  <Link to={pathname === '/tracker' ? '/' : '/tracker'}>
                    <Button variant={pathname === '/tracker' ? 'default' : 'outline'} size="sm" className="flex items-center gap-1.5">
                      <LayoutList className="h-3.5 w-3.5" />
                      {pathname === '/tracker' ? 'Prompter' : 'Tracker'}
                    </Button>
                  </Link>
                  {hasCompletedOnboarding && (
                    <>
                      <Link to="/resume">
                        <Button variant={pathname === '/resume' ? 'default' : 'outline'} size="sm" className="flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5" />
                          My Resume
                        </Button>
                      </Link>
                      <Link to="/jd-matcher">
                        <Button variant={pathname === '/jd-matcher' ? 'default' : 'outline'} size="sm" className="flex items-center gap-1.5">
                          <Target className="h-3.5 w-3.5" />
                          Match JD
                        </Button>
                      </Link>
                      <Link to="/resume-score">
                        <Button variant={pathname === '/resume-score' ? 'default' : 'outline'} size="sm" className="flex items-center gap-1.5">
                          <BarChart3 className="h-3.5 w-3.5" />
                          Score Resume
                        </Button>
                      </Link>
                    </>
                  )}
                  <span className="text-sm hidden lg:flex text-muted-foreground">
                    Hello, {currentUser.displayName || currentUser.email}
                  </span>
                  <TokenBadge />
                  {isAdmin && (
                    <Link to="/admin">
                      <Button variant="ghost" size="sm" className="flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Admin
                      </Button>
                    </Link>
                  )}
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
