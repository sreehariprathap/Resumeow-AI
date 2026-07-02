import { useAuth } from "@/lib/authContext";
import { useTokens } from "@/lib/tokenContext";
import { useOnboarding } from "@/lib/onboardingContext";
import { Button } from "./ui/button";
import { useTheme } from "./theme-provider";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutList, ShieldCheck, FileText, Target, BarChart3, LogOut, User, UserCircle, Zap, Sun, Moon } from "lucide-react";
import { TokenBadge } from "./TokenBadge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useState } from "react";
import { RequestTokensDialog } from "./RequestTokensDialog";

export const WebHeader = () => {
  const { currentUser, logout } = useAuth();
  const { isAdmin, tokensRemaining } = useTokens();
  const isAllowed = isAdmin || currentUser?.email === 'srhari615@gmail.com';
  const { hasCompletedOnboarding } = useOnboarding();
  const { theme, setTheme } = useTheme();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <>
    <header className="web-header">
      <div className="container flex justify-between items-center">
        <Link to="/" className="flex gap-0 flex-col items-start transition-opacity hover:opacity-80">
          <img
            src={theme === 'dark' ? "/Resumeow..png" : "/Resumeow-d.png"}
            className="w-32 lg:w-44"
            alt="Resumeow logo"
          />
          <span className="text-sm font-normal text-foreground">full throttle</span>
        </Link>

        <TooltipProvider delayDuration={300}>
          <div className="flex items-center gap-1">
            {currentUser && (
              <>
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
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuLabel className="text-xs font-normal text-muted-foreground truncate">
                      {currentUser.displayName || currentUser.email}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => navigate(pathname === '/tracker' ? '/' : '/tracker')}
                      className={`gap-2 ${pathname === '/tracker' ? 'font-medium' : ''}`}
                    >
                      <LayoutList className="h-3.5 w-3.5" />
                      {pathname === '/tracker' ? 'Prompter' : 'Tracker'}
                    </DropdownMenuItem>
                    {hasCompletedOnboarding && (
                      <>
                        <DropdownMenuItem
                          onClick={() => navigate('/resume')}
                          className={`gap-2 ${pathname === '/resume' ? 'font-medium' : ''}`}
                        >
                          <FileText className="h-3.5 w-3.5" /> My Resume
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => navigate('/jd-matcher')}
                          className={`gap-2 ${pathname === '/jd-matcher' ? 'font-medium' : ''}`}
                        >
                          <Target className="h-3.5 w-3.5" /> Match JD
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => navigate('/resume-score')}
                          className={`gap-2 ${pathname === '/resume-score' ? 'font-medium' : ''}`}
                        >
                          <BarChart3 className="h-3.5 w-3.5" /> Score Resume
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/profile')} className="gap-2">
                      <UserCircle className="h-3.5 w-3.5" /> Edit Profile
                    </DropdownMenuItem>
                    {!isAllowed && (
                      <DropdownMenuItem onClick={() => setTokenDialogOpen(true)} className="gap-2">
                        <Zap className="h-3.5 w-3.5 text-yellow-500" />
                        Request Tokens
                        {tokensRemaining === 0 && <span className="ml-auto text-xs text-red-500 font-medium">0 left</span>}
                      </DropdownMenuItem>
                    )}
                    {isAllowed && (
                      <DropdownMenuItem onClick={() => navigate('/admin')} className="gap-2">
                        <ShieldCheck className="h-3.5 w-3.5" /> Admin
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="gap-2">
                        {theme === 'dark' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
                        Theme
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        <DropdownMenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as 'light' | 'dark' | 'system')}>
                          <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="system">System</DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
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
    <RequestTokensDialog open={tokenDialogOpen} onOpenChange={setTokenDialogOpen} />
    </>
  );
};
