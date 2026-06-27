import type { FieldType, JobSite, WorkdayStep, ResumeProfile, AIAnswers, FillResult } from '../shared/types';

// ─── Site detection ───────────────────────────────────────────────────────────

function detectJobSite(): JobSite {
  const url = window.location.href;
  if (url.includes('linkedin.com/jobs')) return 'linkedin';
  if (url.includes('indeed.com')) return 'indeed';
  if (url.includes('greenhouse.io')) return 'greenhouse';
  if (url.includes('lever.co')) return 'lever';
  if (url.includes('ashby')) return 'ashby';
  if (url.includes('myworkdayjobs.com') || url.includes('workday.com')) return 'workday';
  if (url.includes('glassdoor.com')) return 'glassdoor';
  if (url.includes('smartrecruiters.com')) return 'smartrecruiters';
  if (url.includes('icims.com')) return 'icims';
  if (url.includes('taleo.net')) return 'taleo';
  if (url.includes('successfactors.com')) return 'successfactors';
  return 'unknown';
}

// ─── Workday selectors ────────────────────────────────────────────────────────

const WORKDAY_JD_SELECTORS = [
  '[data-automation-id="jobPostingDescription"]',
  '[data-automation-id="jobPostingQualifications"]',
  '[data-automation-id="jobRequisitionDescription"]',
  '.job-requisition-description',
  'div[class*="wd-text"]',
  '[role="region"][aria-label*="Job"]',
  '[role="region"][aria-label*="Description"]',
];

const WORKDAY_TITLE_SELECTORS = [
  '[data-automation-id="jobPostingHeader"]',
  'h2.css-1q08ki3',
  '[class*="jobTitle"]',
];

const WORKDAY_COMPANY_SELECTORS = [
  '[data-automation-id="company-name"]',
  '.css-1baulvz',
];

// ─── Content extraction ───────────────────────────────────────────────────────

const JD_SELECTORS: Record<JobSite, string[]> = {
  linkedin: ['.jobs-description__content', '.job-view-layout'],
  indeed: ['.jobsearch-jobDescriptionText', '#jobDescriptionText'],
  greenhouse: ['.job__description', '#content'],
  lever: ['.posting-description', '.content'],
  ashby: ['.ashby-job-posting-description', '[data-testid="job-description"]'],
  workday: WORKDAY_JD_SELECTORS,
  glassdoor: ['.jobDescriptionContent', '[data-test="jobDesc"]'],
  smartrecruiters: ['.job-description', '.description'],
  icims: ['#job-description', '.iCIMS_JobDescriptionBodyFrameOuter', '[class*="job-description"]'],
  taleo: ['#requisitionDescriptionInterface', '.ft-details-description', '[class*="description"]'],
  successfactors: ['[class*="job-description"]', '.description-block', 'div[id*="desc"]'],
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

async function waitForSelector(selector: string, timeout = 3000): Promise<Element | null> {
  return new Promise((resolve) => {
    const existing = document.querySelector(selector);
    if (existing) { resolve(existing); return; }

    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) { observer.disconnect(); resolve(el); }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => { observer.disconnect(); resolve(null); }, timeout);
  });
}

async function extractJobDescriptionAsync(): Promise<string> {
  const site = detectJobSite();

  if (site === 'workday') {
    const descEl =
      await waitForSelector('[data-automation-id="jobPostingDescription"]', 4000) ??
      await waitForSelector('[data-automation-id="jobRequisitionDescription"]', 2000);

    if (descEl) return descEl.textContent?.trim() ?? '';

    // Fallback: grab all text from main content area
    const main = document.querySelector('main') ?? document.querySelector('[role="main"]');
    return main?.textContent?.slice(0, 5000) ?? '';
  }

  // For other sites, sync extraction is fine (content is SSR'd)
  return extractJobDescription();
}

function extractJobTitle(): string {
  const site = detectJobSite();

  if (site === 'workday') {
    for (const sel of WORKDAY_TITLE_SELECTORS) {
      const el = document.querySelector(sel);
      if (el?.textContent) return el.textContent.trim();
    }
  }

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
  const site = detectJobSite();

  if (site === 'workday') {
    for (const sel of WORKDAY_COMPANY_SELECTORS) {
      const el = document.querySelector(sel);
      if (el?.textContent) return el.textContent.trim();
    }
  }

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

// ─── Workday multi-step detection ─────────────────────────────────────────────

function detectWorkdayStep(): WorkdayStep {
  const stepText =
    document.querySelector('[data-automation-id="currentStep"]')?.textContent?.toLowerCase() ?? '';

  const progressItems = Array.from(
    document.querySelectorAll('[role="tab"][aria-selected="true"]')
  ).map((el) => el.textContent?.toLowerCase() ?? '');

  const allText = stepText + ' ' + progressItems.join(' ');

  if (allText.includes('my information') || allText.includes('personal info')) return 'my-information';
  if (allText.includes('experience') || allText.includes('resume')) return 'my-experience';
  if (allText.includes('application question')) return 'application-questions';
  if (allText.includes('self-identify')) return 'self-identify';
  if (allText.includes('voluntary')) return 'voluntary-disclosures';
  if (allText.includes('review')) return 'review';
  return 'unknown';
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

// ─── Generic form filling ─────────────────────────────────────────────────────

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
    case 'github': return '';
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

// ─── Workday-specific filling ─────────────────────────────────────────────────

async function fillWorkdayField(automationId: string, value: string): Promise<boolean> {
  const el = document.querySelector(
    `[data-automation-id="${automationId}"]`
  ) as HTMLInputElement | HTMLTextAreaElement | null;
  if (!el || !value) return false;

  const inputProto = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  const textareaProto = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');

  el.focus();

  if (el instanceof HTMLInputElement && inputProto?.set) {
    inputProto.set.call(el, value);
  } else if (el instanceof HTMLTextAreaElement && textareaProto?.set) {
    textareaProto.set.call(el, value);
  } else {
    (el as HTMLInputElement).value = value;
  }

  el.dispatchEvent(new InputEvent('input', { bubbles: true, data: value }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
  el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
  el.blur();

  await new Promise((r) => setTimeout(r, 100));
  return true;
}

async function fillWorkdayDropdown(automationId: string, valueText: string): Promise<boolean> {
  const trigger = document.querySelector(
    `[data-automation-id="${automationId}"] button`
  ) as HTMLElement | null;
  if (!trigger) return false;

  trigger.click();
  await new Promise((r) => setTimeout(r, 300));

  const options = document.querySelectorAll('[role="option"]');
  for (const opt of options) {
    if (opt.textContent?.toLowerCase().includes(valueText.toLowerCase())) {
      (opt as HTMLElement).click();
      return true;
    }
  }
  return false;
}

async function fillWorkdayRadio(automationId: string, value: 'yes' | 'no'): Promise<boolean> {
  const container = document.querySelector(`[data-automation-id="${automationId}"]`);
  if (!container) return false;

  const radios = container.querySelectorAll('[role="radio"]');
  for (const radio of radios) {
    const label = radio.textContent?.toLowerCase().trim() ?? '';
    if (
      (value === 'yes' && (label === 'yes' || label === 'i am')) ||
      (value === 'no' && (label === 'no' || label === 'i am not'))
    ) {
      (radio as HTMLElement).click();
      return true;
    }
  }
  return false;
}

async function fillWorkdayForms(
  profile: ResumeProfile,
  aiAnswers?: AIAnswers
): Promise<FillResult> {
  const step = detectWorkdayStep();
  let filled = 0;
  const skipped: string[] = [];

  if (step === 'my-information') {
    if (await fillWorkdayField('legalNameSection_firstName', profile.firstName)) filled++;
    else skipped.push('First Name');

    if (await fillWorkdayField('legalNameSection_lastName', profile.lastName)) filled++;
    else skipped.push('Last Name');

    if (await fillWorkdayField('email', profile.email)) filled++;
    else skipped.push('Email');

    if (await fillWorkdayField('phone-number', profile.phone)) filled++;
    else skipped.push('Phone');

    if (profile.linkedin && await fillWorkdayField('linkedIn', profile.linkedin)) filled++;
    if (profile.website && await fillWorkdayField('portfolioSite', profile.website)) filled++;

    if (await fillWorkdayRadio('legallyAuthorized', 'yes')) filled++;
    if (await fillWorkdayRadio('requireVisa', 'no')) filled++;
  } else if (step === 'application-questions') {
    if (aiAnswers?.coverLetter) {
      const coverEl = document.querySelector(
        '[data-automation-id="coverLetter"] textarea, textarea[class*="cover"]'
      ) as HTMLTextAreaElement | null;
      if (coverEl) {
        await fillField(coverEl, aiAnswers.coverLetter);
        filled++;
      } else {
        skipped.push('Cover Letter');
      }
    }

    // Fill open-ended "why this company / role" questions
    const textareas = document.querySelectorAll<HTMLTextAreaElement>('textarea');
    for (const ta of textareas) {
      const label = getFieldLabel(ta).toLowerCase();
      if (/why.*compan|why.*role|why.*interest/i.test(label) && aiAnswers?.whyThisCompany) {
        await fillField(ta, aiAnswers.whyThisCompany);
        filled++;
      }
    }
  } else {
    // Unknown step — fall back to generic detection
    const result = await fillForms(profile, aiAnswers);
    filled += result.filled;
    skipped.push(...result.skipped);
  }

  return { filled, skipped };
}

// ─── Field highlighting ───────────────────────────────────────────────────────

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
      workdayStep: detectWorkdayStep(),
      isApplicationPage: detectFormFields().length > 0,
      isJobListingPage: extractJobDescription().length > 100 && detectFormFields().length === 0,
    });
    return false;
  }

  if (msg.type === 'SCAN_PAGE_ASYNC') {
    extractJobDescriptionAsync().then((jd) => {
      const fieldCount = detectFormFields().length;
      sendResponse({
        site: detectJobSite(),
        jobTitle: extractJobTitle(),
        company: extractCompanyName(),
        jobDescription: jd,
        fieldCount,
        workdayStep: detectWorkdayStep(),
        isApplicationPage: fieldCount > 0,
        isJobListingPage: jd.length > 100 && fieldCount === 0,
      });
    });
    return true; // async
  }

  if (msg.type === 'FILL_FORMS') {
    const { profile, aiAnswers } = msg.data as { profile: ResumeProfile; aiAnswers?: AIAnswers };
    fillForms(profile, aiAnswers)
      .then((result) => sendResponse(result))
      .catch((err: Error) => sendResponse({ error: err.message }));
    return true;
  }

  if (msg.type === 'FILL_FORMS_WORKDAY') {
    const { profile, aiAnswers } = msg.data as { profile: ResumeProfile; aiAnswers?: AIAnswers };
    fillWorkdayForms(profile, aiAnswers)
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
