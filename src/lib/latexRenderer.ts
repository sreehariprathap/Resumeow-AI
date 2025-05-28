/**
 * Opens a new window and displays LaTeX content with formatting
 * 
 * @param latexContent The LaTeX content to display
 * @param title Optional title for the new window
 */
export function displayLatexInNewWindow(latexContent: string, title: string = 'LaTeX Preview'): void {
  try {
    // Clean the LaTeX content
    let cleanedContent = latexContent;
    cleanedContent = cleanedContent.replace(/^```(?:latex)?/m, '');
    cleanedContent = cleanedContent.replace(/```$/m, '');
    cleanedContent = cleanedContent.trim();
    
    // Create a new window
    const newWindow = window.open('', '_blank');
    
    if (!newWindow) {
      throw new Error('Failed to open a new window. Please check if pop-ups are blocked.');
    }
    
    // Create complete HTML document structure with CSS for styling
    const fullHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body {
            font-family: 'Times New Roman', Times, serif;
            line-height: 1.5;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
          }
          .latex-container {
            background-color: white;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 5px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          pre.latex {
            white-space: pre-wrap;
            font-family: 'Times New Roman', Times, serif;
            line-height: 1.6;
          }
          .centered {
            text-align: center;
            margin: 1em 0;
          }
          .document-title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 1em;
            text-align: center;
          }
          .section {
            font-size: 18px;
            font-weight: bold;
            margin-top: 1.5em;
            margin-bottom: 0.5em;
          }
          p { margin-bottom: 0.8em; }
          .note {
            margin-top: 20px;
            font-style: italic;
            color: #666;
            font-size: 14px;
          }
          .button-container {
            display: flex;
            justify-content: center;
            margin: 20px 0;
          }
          button {
            padding: 8px 16px;
            background-color: #4a90e2;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            margin: 0 8px;
          }
          button:hover {
            background-color: #3a80d2;
          }
        </style>
        <script>
          // Function to format LaTeX content for HTML display
          function formatLatexContent() {
            const latexContent = document.getElementById('latex-content').textContent;
            const formattedContent = document.getElementById('formatted-content');
            
            // Basic formatting for sections
            let formatted = latexContent
              .replace(/\\\\section\\{([^}]+)\\}/g, '<div class="section">$1</div>')
              .replace(/\\\\subsection\\{([^}]+)\\}/g, '<div class="subsection">$1</div>')
              .replace(/\\\\begin\\{document\\}/g, '')
              .replace(/\\\\end\\{document\\}/g, '')
              .replace(/\\\\begin\\{center\\}([\\s\\S]*?)\\\\end\\{center\\}/g, '<div class="centered">$1</div>')
              .replace(/\\\\title\\{([^}]+)\\}/g, '<div class="document-title">$1</div>')
              .replace(/\\\\maketitle/g, '')
              // Basic paragraph handling
              .replace(/\\n\\n/g, '</p><p>')
              // Handle line breaks
              .replace(/\\\\\\\\|\\\\newline/g, '<br>');
              
            formattedContent.innerHTML = '<p>' + formatted + '</p>';
          }

          // Copy formatted text to clipboard
          function copyToClipboard() {
            const formattedContent = document.getElementById('formatted-content');
            
            // Create a range and select the content
            const range = document.createRange();
            range.selectNode(formattedContent);
            
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            
            // Execute copy command
            document.execCommand('copy');
            
            // Deselect the content
            selection.removeAllRanges();
            
            alert('Content copied to clipboard!');
          }

          // Initialize when the page loads
          window.onload = formatLatexContent;
        </script>
      </head>
      <body>
        <div class="latex-container">
          <h1>${title}</h1>
          
          <div class="button-container">
            <button onclick="document.getElementById('raw-view').style.display = 'none'; document.getElementById('formatted-view').style.display = 'block';">
              View Formatted
            </button>
            <button onclick="document.getElementById('formatted-view').style.display = 'none'; document.getElementById('raw-view').style.display = 'block';">
              View Raw LaTeX
            </button>
            <button onclick="copyToClipboard()">Copy to Clipboard</button>
          </div>
          
          <div id="formatted-view">
            <div id="formatted-content"></div>
          </div>
          
          <div id="raw-view" style="display: none;">
            <pre class="latex" id="latex-content">${cleanedContent}</pre>
          </div>
          
          <p class="note">
            Note: This is a basic preview. For accurate rendering, please use a LaTeX compiler or online LaTeX editor like Overleaf.
          </p>
        </div>
      </body>
      </html>
    `;
      // Write content to the new window
    newWindow.document.open();
    newWindow.document.write(fullHtml);
    newWindow.document.close();
  } catch (error) {
    console.error('Error displaying LaTeX in new window:', error);
    alert(`Error displaying LaTeX: ${(error as Error).message}`);
  }
}
