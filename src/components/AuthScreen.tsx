import { useState } from "react";
import { useAuth } from "@/lib/authContext";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { toast } from "sonner";
import { LogIn, LogOut, User, Mail, Lock, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Link } from "react-router-dom";

export function AuthScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "register" | "reset">("login");
  const { currentUser, isAuthenticated, loginWithGoogle, loginWithEmail, registerWithEmail, resetPassword, logout } = useAuth();
  
  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      
      const user = await loginWithGoogle();
      
      if (user) {
        toast.success("Successfully signed in with Google!");
      }
    } catch (error) {
      console.error("Error signing in with Google:", error);
      
      toast.error("Failed to sign in with Google. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter both email and password");
      return;
    }

    try {
      setIsLoading(true);
      await loginWithEmail(email, password);
      toast.success("Successfully signed in!");
      setEmail("");
      setPassword("");
    } catch (error) {
      console.error("Error signing in:", error);
      toast.error("Failed to sign in. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter both email and password");
      return;
    }

    try {
      setIsLoading(true);
      await registerWithEmail(email, password, displayName || undefined);
      toast.success("Account created successfully!");
      setEmail("");
      setPassword("");
      setDisplayName("");
      setAuthMode("login");
    } catch (error) {
      console.error("Error registering:", error);
      toast.error("Failed to create account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    try {
      setIsLoading(true);
      await resetPassword(email);
      toast.success("Password reset email sent!");
      setEmail("");
      setAuthMode("login");
    } catch (error) {
      console.error("Error sending reset email:", error);
      toast.error("Failed to send reset email. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setIsLoading(true);
      await logout();
      toast.success("Successfully signed out!");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to sign out. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };  if (isAuthenticated) {
    return (
      <Card className="auth-screen-card w-full max-w-md mx-auto">
        <CardHeader className="p-4 pb-2">
          <CardTitle>Account</CardTitle>
          <CardDescription>You are signed in as:</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 pb-2">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">{currentUser?.displayName || "User"}</p>
              <p className="text-sm text-muted-foreground">{currentUser?.email}</p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="p-4 pt-0">
          <Button 
            onClick={handleSignOut} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? "Signing out..." : "Sign Out"}
            <LogOut className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    );
  }  return (
    <Card className="auth-screen-card w-full max-w-md mx-auto">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="flex flex-col gap-5">
           <img src="/Resumeow-d.png" />
           <h1 className="text-center">

          {authMode === "login" ? "Sign In" : authMode === "register" ? "Create Account" : "Reset Password"}
           </h1>
        </CardTitle>
        <CardDescription>
          <h1 className="text-center">

          {authMode === "login" 
            ? "Enter your credentials to access your account" 
            : authMode === "register" 
              ? "Create a new account to get started"
              : "We'll send you an email to reset your password"
          }
          </h1>
        </CardDescription>
      </CardHeader>      <CardContent className="p-4 pt-0">
        <Tabs value={authMode} onValueChange={(value: string) => setAuthMode(value as "login" | "register" | "reset")}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="login" className="text-xs py-1">Login</TabsTrigger>
            <TabsTrigger value="register" className="text-xs py-1">Register</TabsTrigger>
            <TabsTrigger value="reset" className="text-xs py-1">Reset</TabsTrigger>
          </TabsList>
            <TabsContent value="login">
            <form onSubmit={handleEmailSignIn} className="space-y-3">
              <div className="space-y-1 flex flex-col gap-2">
                <Label htmlFor="email" className="text-xs">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-1 flex flex-col gap-2">
                <Label htmlFor="password" className="text-xs">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign In"}
                <LogIn className="ml-2 h-4 w-4" />
              </Button>
            </form>
              <div className="mt-4 relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>
              <Button
              variant="outline"
              className="w-full mt-4"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
            >
              <span className="mr-2 font-bold">G</span>
              Google
            </Button>
          </TabsContent>
          
          <TabsContent value="register">            
            <form onSubmit={handleRegister} className="space-y-3 ">
              <div className="space-y-1flex flex-col gap-2">
                <Label htmlFor="display-name" className="text-xs">Name (Optional)</Label>
                <Input
                  id="display-name"
                  type="text"
                  placeholder="Your name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              
              <div className="space-y-1 flex flex-col gap-2">
                <Label htmlFor="email-register" className="text-xs">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email-register"
                    type="email"                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-1 flex flex-col gap-2">
                <Label htmlFor="password-register" className="text-xs">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password-register"
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? "Creating account..." : "Create Account"}
              </Button>
            </form>
          </TabsContent>
            <TabsContent value="reset">
            <form onSubmit={handlePasswordReset} className="space-y-3">
              <div className="space-y-1 flex flex-col gap-2">
                <Label htmlFor="email-reset" className="text-xs">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email-reset"
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              
              <div className={`flex items-center p-3 text-sm bg-muted/50 rounded-md gap-2`}>
                <AlertCircle className={`h-4 w-4 text-muted-foreground`} />
                <p className="text-muted-foreground">
                  We'll send you an email with a link to reset your password.
                </p>
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="p-4 pt-2 flex justify-center">
        <div className="text-center">
          <Link 
            to="/privacy" 
            className="text-xs text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Privacy Policy
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
