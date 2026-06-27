import { useAuth } from "@/lib/authContext";
import { useTokens } from "@/lib/tokenContext";
import { useOnboarding } from "@/lib/onboardingContext";
import { Button } from "./ui/button";
import { ModeToggle } from "./mode-toggle";
import { useTheme } from "./theme-provider";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutList, ShieldCheck, FileText, Target, BarChart3, LogOut, User } from "lucide-react";
import { TokenBadge } from "./TokenBadge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

const NavIcon = ({ to, icon: Icon, label, active }: {
  to: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Link to={to}>
        <Button
          variant={active ? 'default' : 'ghost'}
          size="icon"
          className="h-8 w-8"
        >
          <Icon className="h-4 w-4" />
        </Button>
      </Link>
    </TooltipTrigger>
    <TooltipContent side="bottom">{label}</TooltipContent>
  </Tooltip>
);

export const WebHeader = () => {
  const { currentUser, logout } = useAuth();
  const { isAdmin } = useTokens();
  const { hasCompletedOnboarding } = useOnboarding();
  const { theme } = useTheme();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
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

        <TooltipProvider delayDuration={300}>
          <div className="flex items-center gap-1">
            <ModeToggle />

            {currentUser && (
              <>
                <NavIcon
                  to={pathname === '/tracker' ? '/' : '/tracker'}
                  icon={LayoutList}
                  label={pathname === '/tracker' ? 'Prompter' : 'Tracker'}
                  active={pathname === '/tracker'}
                />

                {hasCompletedOnboarding && (
                  <>
                    <NavIcon to="/resume" icon={FileText} label="My Resume" active={pathname === '/resume'} />
                    <NavIcon to="/jd-matcher" icon={Target} label="Match JD" active={pathname === '/jd-matcher'} />
                    <NavIcon to="/resume-score" icon={BarChart3} label="Score Resume" active={pathname === '/resume-score'} />
                  </>
                )}

                {isAdmin && (
                  <NavIcon to="/admin" icon={ShieldCheck} label="Admin" active={pathname === '/admin'} />
                )}

                <TokenBadge />

                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <User className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Account</TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel className="text-xs font-normal text-muted-foreground truncate">
                      {currentUser.displayName || currentUser.email}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="gap-2 text-destructive focus:text-destructive">
                      <LogOut className="h-3.5 w-3.5" /> Log Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </TooltipProvider>
      </div>
    </header>
  );
};
