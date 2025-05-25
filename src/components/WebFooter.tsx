import { Link } from "react-router-dom";

export const WebFooter = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="web-footer">
      <div className="container">
        <p className="text-sm text-muted-foreground">
          &copy; {currentYear} Prompter - Resume & Cover Letter Assistant
        </p>
        <div className="mt-2 flex gap-4 justify-center">
          <Link to="/privacy" className="text-sm text-muted-foreground hover:text-primary">
            Privacy Policy
          </Link>
          <a href="#" className="text-sm text-muted-foreground hover:text-primary">
            Terms of Service
          </a>
          <a href="mailto:sreehariprathap1996@gmail.com" className="text-sm text-muted-foreground hover:text-primary">
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
};
