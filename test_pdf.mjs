import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

async function extractFromPDF(filePath) {
  const data = new Uint8Array(fs.readFileSync(filePath));
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    
    const items = content.items || [];
    let lastY = -1;
    let pageText = '';

    for (let j = 0; j < items.length; j++) {
      const item = items[j];
      if ('str' in item) {
        const y = item.transform[5];
        if (lastY !== -1 && Math.abs(y - lastY) > 5) {
          pageText += '\n';
        }
        pageText += item.str;
        if (item.hasEOL) pageText += '\n';
        lastY = y;
      }
    }
    pages.push(pageText);
  }
  return pages.join('\n\n--- PAGE BREAK ---\n\n');
}

extractFromPDF('public/templates/sreehari/sreehari.pdf').then(text => {
  console.log("Extraction successful, length:", text.length);
  console.log(text.slice(0, 500));
}).catch(console.error);
