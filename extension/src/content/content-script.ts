import type { FieldType, JobSite, ResumeProfile, AIAnswers, FillResult } from '../shared/types';

// ─── Site detection ───────────────────────────────────────────────────────────

function detectJobSite(): JobSite {
  const url = window.location.href;
  if (url.includes('linkedin.com/jobs')) return 'linkedin';
  if (url.includes('indeed.com')) return 'indeed';
  if (url.includes('greenhouse.io')) return 'greenhouse';
  if (url.includes('lever.co')) return 'lever';
  if (url.includes('ashby')) return 'ashby';
  if (url.includes('workday.com')) return 'workday';
  if (url.includes('glassdoor.com')) return 'glassdoor';
  if (url.includes('smartrecruiters.com')) return 'smartrecruiters';
  return 'unknown';
}

// ─── Content extraction ───────────────────────────────────────────────────────

const JD_SELECTORS: Record<JobSite, string[]> = {
  linkedin: ['.jobs-description__content', '.job-view-layout'],
  indeed: ['.jobsearch-jobDescriptionText', '#jobDescriptionText'],
  greenhouse: ['.job__description', '#content'],
  lever: ['.posting-description', '.content'],
  ashby: ['.ashby-job-posting-description', '[data-testid="job-description"]'],
  workday: ['[data-automation-id="jobPostingDescription"]'],
  glassdoor: ['.jobDescriptionContent', '[data-test="jobDesc"]'],
  smartrecruiters: ['.job-description', '.description'],
  unknown: ['[class*="description"]', '[id*="description"]', 'main article'],
};

function extractJobDescription(): string {
  const site = detectJobSite();
  for (const selector of JD_SELECTORS[site]) {
    const el = document.querySelector(selector);
    if (el?.textContent) return el.textContent.trim();
  }
  return document.body.innerText.slice(0, 3000);
}

function extractJobTitle(): string {
  const selectors = [
    'h1.jobs-unified-top-card__job-title',
    'h1[data-testid="jobsearch-JobInfoHeader-title"]',
    '.posting-headline h2',
    'h1.job-title',
    'h1',
  ];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el?.textContent) return el.textContent.trim();
  }
  return document.title;
}

function extractCompanyName(): string {
  const selectors = [
    '.jobs-unified-top-card__company-name',
    '[data-testid="inlineHeader-companyName"]',
    '.posting-headline .posting-category',
    '[class*="company-name"]',
    '[class*="companyName"]',
  ];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el?.textContent) return el.textContent.trim();
  }
  return '';
}

// ─── Form field detection ─────────────────────────────────────────────────────

interface DetectedField {
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  fieldType: FieldType;
  label: string;
}

function getFieldLabel(el: HTMLElement): string {
  const ariaLabel = el.getAttribute('aria-label') ?? '';
  if (ariaLabel) return ariaLabel;

  const id = el.getAttribute('id');
  if (id) {
    const label = document.querySelector(`label[for="${id}"]`);
    if (label?.textContent) return label.textContent.trim();
  }

  const parent = el.parentElement;
  if (parent) {
    const labelEl = parent.querySelector('label');
    if (labelEl?.textContent) return labelEl.textContent.trim();
    // Try grandparent
    const gp = parent.parentElement;
    if (gp) {
      const gpLabel = gp.querySelector('label');
      if (gpLabel?.textContent) return gpLabel.textContent.trim();
    }
  }

  return (
    el.getAttribute('placeholder') ??
    el.getAttribute('name') ??
    el.getAttribute('data-testid') ??
    ''
  );
}

function classifyField(el: HTMLElement, label: string): FieldType {
  const name = (el.getAttribute('name') ?? '').toLowerCase();
  const id = (el.getAttribute('id') ?? '').toLowerCase();
  const combined = `${label.toLowerCase()} ${name} ${id}`;

  if (/first.?name|given.?name|firstname/i.test(combined)) return 'firstName';
  if (/last.?name|family.?name|surname|lastname/i.test(combined)) return 'lastName';
  if (/\bemail\b/i.test(combined)) return 'email';
  if (/\bphone\b|\bmobile\b|\btel\b/i.test(combined)) return 'phone';
  if (/\bcity\b|\blocation\b|\baddress\b/i.test(combined)) return 'location';
  if (/linkedin/i.test(combined)) return 'linkedin';
  if (/\bgithub\b/i.test(combined)) return 'github';
  if (/\bwebsite\b|\bportfolio\b|personal.?site/i.test(combined)) return 'website';
  if (/cover.?letter/i.test(combined)) return 'coverLetter';
  if (/why.*compan|why.*role|why.*interest|tell.*about.*yourself/i.test(combined)) return 'whyThisCompany';
  if (/additional|anything.?else|other.?info/i.test(combined)) return 'additionalInfo';
  if (/work.*author|legally.*work|eligible.*work|authorized/i.test(combined)) return 'workAuthorization';
  if (/veteran/i.test(combined)) return 'veteranStatus';
  if (/disability|disabled/i.test(combined)) return 'disabilityStatus';
  if (/years.*experience|experience.*years/i.test(combined)) return 'yearsOfExperience';
  if (/salary|compensation|expected.*pay/i.test(combined)) return 'salaryExpectation';
  return 'unknown';
}

function detectFormFields(): DetectedField[] {
  const inputs = Array.from(
    document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      'input:not([type="hidden"]):not([type="file"]):not([type="submit"]):not([type="button"]), textarea, select'
    )
  );

  return inputs
    .map((input) => {
      const label = getFieldLabel(input);
      const fieldType = classifyField(input, label);
      return { element: input, fieldType, label };
    })
    .filter((f) => f.fieldType !== 'unknown');
}

// ─── Form filling ─────────────────────────────────────────────────────────────

function getValueForField(
  fieldType: FieldType,
  profile: ResumeProfile,
  aiAnswers?: AIAnswers
): string {
  switch (fieldType) {
    case 'firstName': return profile.firstName;
    case 'lastName': return profile.lastName;
    case 'email': return profile.email;
    case 'phone': return profile.phone;
    case 'location': return profile.location;
    case 'linkedin': return profile.linkedin ?? '';
    case 'website': return profile.website ?? '';
    case 'github': return ''; // not in ResumeProfile, intentionally blank
    case 'coverLetter': return aiAnswers?.coverLetter ?? '';
    case 'whyThisCompany': return aiAnswers?.whyThisCompany ?? '';
    case 'additionalInfo': return aiAnswers?.additionalInfo ?? '';
    case 'yearsOfExperience': return aiAnswers?.yearsOfExperience ?? '';
    case 'workAuthorization': return 'Yes';
    case 'veteranStatus': return 'I am not a protected veteran';
    case 'disabilityStatus': return 'I do not have a disability';
    case 'salaryExpectation': return '';
    default: return '';
  }
}

async function fillField(
  el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: string
): Promise<void> {
  if (!value) return;

  el.focus();

  if (el instanceof HTMLSelectElement) {
    // Try to find a matching option
    const lower = value.toLowerCase();
    const option = Array.from(el.options).find(
      (o) => o.text.toLowerCase().includes(lower) || o.value.toLowerCase().includes(lower)
    );
    if (option) {
      el.value = option.value;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
    return;
  }

  // Use native setter to bypass React's synthetic event system
  const inputProto = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  const textareaProto = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');

  if (el instanceof HTMLInputElement && inputProto?.set) {
    inputProto.set.call(el, value);
  } else if (el instanceof HTMLTextAreaElement && textareaProto?.set) {
    textareaProto.set.call(el, value);
  } else {
    el.value = value;
  }

  el.dispatchEvent(new InputEvent('input', { bubbles: true, data: value }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.dispatchEvent(new Event('blur', { bubbles: true }));

  await new Promise((r) => setTimeout(r, 60));
}

async function fillForms(
  profile: ResumeProfile,
  aiAnswers?: AIAnswers
): Promise<FillResult> {
  const fields = detectFormFields();
  let filled = 0;
  const skipped: string[] = [];

  for (const field of fields) {
    const value = getValueForField(field.fieldType, profile, aiAnswers);
    if (value) {
      await fillField(field.element, value);
      filled++;
    } else {
      skipped.push(field.label || field.fieldType);
    }
  }

  return { filled, skipped };
}

function highlightDetectedFields(): void {
  const fields = detectFormFields();
  fields.forEach((f) => {
    f.element.style.outline = '2px solid #6366f1';
    f.element.style.outlineOffset = '2px';
    f.element.setAttribute('title', `Resumeow will fill: ${f.fieldType}`);
  });
}

// ─── Message listener ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'SCAN_PAGE') {
    sendResponse({
      site: detectJobSite(),
      jobTitle: extractJobTitle(),
      company: extractCompanyName(),
      jobDescription: extractJobDescription(),
      fieldCount: detectFormFields().length,
    });
    return false;
  }

  if (msg.type === 'FILL_FORMS') {
    const { profile, aiAnswers } = msg.data as { profile: ResumeProfile; aiAnswers?: AIAnswers };
    fillForms(profile, aiAnswers)
      .then((result) => sendResponse(result))
      .catch((err: Error) => sendResponse({ error: err.message }));
    return true;
  }

  if (msg.type === 'HIGHLIGHT_FIELDS') {
    highlightDetectedFields();
    sendResponse({ ok: true });
    return false;
  }

  return false;
});
