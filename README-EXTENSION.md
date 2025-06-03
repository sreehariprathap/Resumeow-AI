# Prompter Chrome Extension

A Chrome extension for creating optimized resume and cover letter prompts for AI assistants like ChatGPT, Claude, and Google's Gemini.

## Features

- 🎯 **Smart Job Matching**: Analyzes job descriptions and tailors prompts accordingly
- 📝 **Multiple Prompt Types**: Resume optimization, cover letter generation, and ATS analysis
- 🔍 **ATS Optimization**: Built-in ATS scoring and keyword matching
- 🎨 **Professional Templates**: Pre-built templates for different industries and roles
- 🔐 **Secure Authentication**: Google OAuth integration for personalized experience
- 🖥️ **Side Panel Interface**: Full-width side panel that stays open while browsing
- 📌 **Persistent Experience**: Remains open across tabs for continuous workflow

## Installation

### From Source (Development)

1. **Clone and Build**:
   ```bash
   git clone <your-repo-url>
   cd prompter-web
   npm install
   npm run build:extension
   ```

2. **Load Extension in Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `build` folder from this project

3. **Pin the Extension**:
   - Click the extensions icon (puzzle piece) in Chrome toolbar
   - Find "Prompter - Resume & Cover Letter Assistant"
   - Click the pin icon to keep it visible

## Usage

1. **Click the Extension Icon**: The Prompter side panel will open on the right side of your browser
2. **Sign In**: Use Google authentication for personalized features
3. **Select Prompt Type**: Choose from Resume, Cover Letter, or ATS Analysis
4. **Input Your Content**: 
   - Paste your resume/CV content
   - Add the job description you're targeting
   - Include any optional instructions
5. **Generate**: Click generate to create your optimized prompt
6. **Copy & Use**: Copy the generated prompt and use it with your preferred AI assistant

## Side Panel Benefits

- **Persistent Workflow**: The side panel stays open as you navigate between tabs
- **Full Functionality**: Access all features without space constraints
- **Multi-tasking**: Work with job boards and the extension simultaneously
- **Resizable**: Adjust the panel width to fit your workflow
- **Easy Toggle**: Click the extension icon to show/hide the panel

## Permissions

The extension requires the following permissions:
- **Identity**: For Google OAuth authentication
- **Storage**: To save your templates and preferences
- **SidePanel**: To display the extension in Chrome's side panel
- **Host Permissions**: To communicate with Google APIs and Firebase

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build:extension` - Build for Chrome extension
- `npm run lint` - Run ESLint

### Project Structure

```
src/
├── extension.tsx          # Chrome extension entry point
├── main.tsx              # Web app entry point  
├── App.tsx               # Main application component
├── components/           # React components
├── lib/                  # Utilities and contexts
└── types/                # TypeScript type definitions
```

## Privacy

This extension processes your resume and job description data locally and through secure AI services. For detailed privacy information, see our [Privacy Policy](./privacy-policy.md).

## Support

If you encounter any issues or have feature requests, please [open an issue](https://github.com/your-repo/issues) on GitHub.

## License

MIT License - see [LICENSE](./LICENSE) file for details.
