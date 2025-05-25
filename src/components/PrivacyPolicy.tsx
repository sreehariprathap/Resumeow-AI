import { Button } from './ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export function PrivacyPolicy() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <Link to="/">
          <Button variant="ghost" className="flex items-center gap-2 px-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to App</span>
          </Button>
        </Link>
      </div>
      
      <div className="prose dark:prose-invert max-w-none">
        <h1 className="text-2xl font-bold mb-6">Privacy Policy for Prompter by Resumeow - Resume & Cover Letter Assistant</h1>
        <p className="text-sm text-muted-foreground mb-6">Effective Date: May 25, 2025</p>
        
        <p>
          Prompter by Resumeow - Resume & Cover Letter Assistant ("the extension," "we," "us," or "our") is a Chrome extension 
          developed by Sreehari Prathap. This privacy policy explains how we handle user data when you use our extension.
        </p>
        
        <h2 className="text-xl font-semibold mt-8 mb-4">1. Information We Collect</h2>
        
        <h3 className="text-lg font-medium mt-6 mb-2">Authentication Data:</h3>
        <p>
          We use Firebase Authentication to allow users to log in securely. We collect only the minimum information 
          required for authentication, such as email addresses or social login IDs.
        </p>
        
        <h3 className="text-lg font-medium mt-6 mb-2">Storage Data:</h3>
        <p>
          User-generated content or settings may be stored in Firebase Cloud Storage or Firestore to provide core 
          functionality of the extension.
        </p>
        
        <h3 className="text-lg font-medium mt-6 mb-2">AI Prompts:</h3>
        <p>
          When you interact with AI features, your input (prompts) is securely sent to Google Gemini for processing. 
          The responses are returned to your extension session.
        </p>
        
        <h2 className="text-xl font-semibold mt-8 mb-4">2. How We Use Your Information</h2>
        
        <h3 className="text-lg font-medium mt-6 mb-2">Authentication:</h3>
        <p>
          Authentication data is used solely to verify your identity and allow access to your account.
        </p>
        
        <h3 className="text-lg font-medium mt-6 mb-2">Extension Functionality:</h3>
        <p>
          Data stored in Firebase is used only to power extension features, such as saving your settings or user-generated content.
        </p>
        
        <h3 className="text-lg font-medium mt-6 mb-2">AI Processing:</h3>
        <p>
          Prompts you submit to the AI are sent to Google Gemini to generate responses. We do not use your data for training 
          AI models or any analytics.
        </p>
        
        <h2 className="text-xl font-semibold mt-8 mb-4">3. Data Sharing and Disclosure</h2>
        
        <h3 className="text-lg font-medium mt-6 mb-2">No Third-Party Sales:</h3>
        <p>
          We do not sell, rent, or share your personal data with third parties for marketing purposes.
        </p>
        
        <h3 className="text-lg font-medium mt-6 mb-2">Service Providers:</h3>
        <p>
          Data may be processed by Firebase (Google) and Google Gemini, as these services are required to provide extension features. 
          Both services are governed by Google's privacy policies.
        </p>
        
        <h3 className="text-lg font-medium mt-6 mb-2">Legal Requirements:</h3>
        <p>
          We may disclose information only if required by law.
        </p>
        
        <h2 className="text-xl font-semibold mt-8 mb-4">4. Data Security</h2>
        <p>
          We use industry-standard security measures provided by Firebase and Google to protect your data during transmission and storage.
        </p>
        
        <h2 className="text-xl font-semibold mt-8 mb-4">5. Data Retention</h2>
        <p>
          We retain your data only as long as necessary to provide extension services. If you delete your account, your data will be 
          deleted from our systems as soon as possible.
        </p>
        
        <h2 className="text-xl font-semibold mt-8 mb-4">6. Changes to This Policy</h2>
        <p>
          We may update this privacy policy occasionally. Updates will be posted within the extension or at our website.
        </p>
        
        <h2 className="text-xl font-semibold mt-8 mb-4">7. Contact Us</h2>
        <p>
          If you have questions or concerns about this policy, please contact us at sreehariprathap1996@gmail.com.
        </p>
      </div>
    </div>
  );
}

export default PrivacyPolicy;
