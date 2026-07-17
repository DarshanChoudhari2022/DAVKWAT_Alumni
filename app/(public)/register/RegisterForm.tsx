'use client';

import Image from 'next/image';
import type React from 'react';
import { useActionState, useState, useRef, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { Copy, Download, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/components/shared/FieldError';
import { PasswordInput } from '@/components/shared/PasswordInput';
import { cn } from '@/lib/utils/cn';
import {
  buildManualPaymentWhatsappUrl,
  buildUpiPaymentUrl,
  MANUAL_MEMBERSHIP_PAYMENT,
} from '@/lib/payments/manual-upi';
import { VALIDATION_LIMITS } from '@/lib/validations/constraints';
import { LEFT_BEFORE_CLASSES } from '@/lib/validations/registration';
import { PhotoUploadWithCrop } from '@/components/shared/PhotoUploadWithCrop';
import { DocumentUpload } from '@/components/shared/DocumentUpload';
import { registerAction, checkEmailExists, type RegisterState } from './actions';

const initialState: RegisterState = {};
const CURRENT_YEAR = new Date().getFullYear();
const BATCH_YEARS = Array.from({ length: CURRENT_YEAR - 1959 }, (_, i) => CURRENT_YEAR - i);
const STEPS = ['Account', 'Academic', 'Personal', 'Professional', 'Payment & Documents'] as const;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const BIRTH_YEARS = Array.from({ length: CURRENT_YEAR - 1919 }, (_, i) => CURRENT_YEAR - i);

/** Country codes for the phone dropdown — US/UK at top, then common codes */
const COUNTRY_CODES = [
  { code: '+91', label: '🇮🇳 India (+91)' },
  { code: '+1', label: '🇺🇸 US (+1)' },
  { code: '+44', label: '🇬🇧 UK (+44)' },
  { code: '+61', label: '🇦🇺 Australia (+61)' },
  { code: '+971', label: '🇦🇪 UAE (+971)' },
  { code: '+65', label: '🇸🇬 Singapore (+65)' },
  { code: '+49', label: '🇩🇪 Germany (+49)' },
  { code: '+81', label: '🇯🇵 Japan (+81)' },
  { code: '+86', label: '🇨🇳 China (+86)' },
  { code: '+33', label: '🇫🇷 France (+33)' },
  { code: '+966', label: '🇸🇦 Saudi Arabia (+966)' },
  { code: '+974', label: '🇶🇦 Qatar (+974)' },
  { code: '+968', label: '🇴🇲 Oman (+968)' },
  { code: '+977', label: '🇳🇵 Nepal (+977)' },
  { code: '+880', label: '🇧🇩 Bangladesh (+880)' },
  { code: '+94', label: '🇱🇰 Sri Lanka (+94)' },
  { code: '+60', label: '🇲🇾 Malaysia (+60)' },
  { code: '+27', label: '🇿🇦 South Africa (+27)' },
  { code: '+82', label: '🇰🇷 South Korea (+82)' },
  { code: '+39', label: '🇮🇹 Italy (+39)' },
  { code: '+7', label: '🇷🇺 Russia (+7)' },
  { code: '+55', label: '🇧🇷 Brazil (+55)' },
  { code: '+52', label: '🇲🇽 Mexico (+52)' },
  { code: '+234', label: '🇳🇬 Nigeria (+234)' },
  { code: '+254', label: '🇰🇪 Kenya (+254)' },
] as const;

const FIELD_STEP_MAP: Record<string, number> = {
  email: 0,
  password: 0,
  confirmPassword: 0,
  full_name: 1,
  education_level: 1,
  education_stream: 1,
  left_before_schooling_class: 1,
  passing_year: 1,
  passing_year_10th: 1,
  roll_number: 1,
  phone: 2,
  phone_country_code: 2,
  phone_number: 2,
  current_city: 2,
  current_state: 2,
  current_country: 2,
  date_of_birth: 2,
  gender: 2,
  profile_photo: 2,
  occupation: 3,
  company: 3,
  job_title: 3,
  industry: 3,
  linkedin_url: 3,
  bio: 3,
  hide_email: 3,
  hide_phone: 3,
  terms_accepted: 3,
  school_document: 1,
  payment_proof: 4,
  selected_amount: 4,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="accent" loading={pending}>
      Submit registration
    </Button>
  );
}

export interface RegisterFormProps {
  step: number;
  setStep: React.Dispatch<React.SetStateAction<number>>;
}

export function RegisterForm({ step, setStep }: RegisterFormProps) {
  const [state, formAction] = useActionState(registerAction, initialState);
  const [educationLevel, setEducationLevel] = useState('');
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedAmount, setSelectedAmount] = useState<500 | 5000>(500);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [hasPhoto, setHasPhoto] = useState(false);
  const [hasSchoolDoc, setHasSchoolDoc] = useState(false);
  const [hasPaymentProof, setHasPaymentProof] = useState(false);

  const [dobDay, setDobDay] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobYear, setDobYear] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  
  // Left before 10th calculation states
  const [leftClass, setLeftClass] = useState('');
  const [leavingYear, setLeavingYear] = useState('');
  const [batchYear, setBatchYear] = useState('');

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveFormDraft = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      if (!formRef.current) return;
      const fd = new FormData(formRef.current);
      const draft: Record<string, unknown> = {};

      draft.step = step;
      draft.educationLevel = educationLevel;
      draft.leftClass = leftClass;
      draft.leavingYear = leavingYear;
      draft.batchYear = batchYear;
      draft.selectedAmount = selectedAmount;
      draft.countryCode = countryCode;
      draft.dobDay = dobDay;
      draft.dobMonth = dobMonth;
      draft.dobYear = dobYear;

      for (const [key, value] of fd.entries()) {
        if (key === 'password' || key === 'confirmPassword' || value instanceof File) {
          continue;
        }
        draft[key] = value;
      }

      const checkboxes = ['hide_email', 'hide_phone', 'terms_accepted'];
      checkboxes.forEach((cb) => {
        const el = formRef.current?.querySelector<HTMLInputElement>(`input[name="${cb}"]`);
        if (el) {
          draft[cb] = el.checked;
        }
      });

      localStorage.setItem('davkawt_register_draft', JSON.stringify(draft));
    }, 500);
  };

  // Save draft whenever controlled states change
  useEffect(() => {
    saveFormDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    step,
    educationLevel,
    leftClass,
    leavingYear,
    batchYear,
    selectedAmount,
    countryCode,
    dobDay,
    dobMonth,
    dobYear,
  ]);

  // Load draft on mount
  useEffect(() => {
    const saved = localStorage.getItem('davkawt_register_draft');
    if (!saved) return;

    try {
      const draft = JSON.parse(saved);
      if (!draft) return;

      if (typeof draft.step === 'number') setStep(draft.step);
      if (draft.educationLevel) setEducationLevel(draft.educationLevel);
      if (draft.leftClass) setLeftClass(draft.leftClass);
      if (draft.leavingYear) setLeavingYear(draft.leavingYear);
      if (draft.batchYear) setBatchYear(draft.batchYear);
      if (draft.selectedAmount === 500 || draft.selectedAmount === 5000) {
        setSelectedAmount(draft.selectedAmount);
      }
      if (draft.countryCode) setCountryCode(draft.countryCode);
      if (draft.dobDay) setDobDay(draft.dobDay);
      if (draft.dobMonth) setDobMonth(draft.dobMonth);
      if (draft.dobYear) setDobYear(draft.dobYear);

      // Restore uncontrolled inputs after React completes rendering
      setTimeout(() => {
        if (!formRef.current) return;
        Object.entries(draft).forEach(([key, value]) => {
          if (
            [
              'step',
              'educationLevel',
              'leftClass',
              'leavingYear',
              'batchYear',
              'selectedAmount',
              'countryCode',
              'dobDay',
              'dobMonth',
              'dobYear',
              'password',
              'confirmPassword',
            ].includes(key)
          ) {
            return;
          }

          const input = formRef.current?.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
            `[name="${key}"]`
          );

          if (input) {
            if (input.type === 'checkbox') {
              (input as HTMLInputElement).checked = !!value;
            } else {
              input.value = String(value);
            }
          }
        });

        // After restoring inputs, validate and correct restored step index
        const restoredStep = typeof draft.step === 'number' ? draft.step : 0;
        const validStep = getFirstInvalidStep(restoredStep);
        setStep(validStep);
      }, 100);
    } catch (e) {
      console.error('[register] failed to restore draft:', e);
    }
  // Draft restore runs once after inputs are rehydrated; getFirstInvalidStep reads the DOM at that moment.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setStep]);

  // Clean up save draft timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  // Automatically calculate batch year for left_before_10th
  useEffect(() => {
    if (educationLevel === 'left_before_10th' && leftClass && leavingYear) {
      const match = leftClass.match(/(\d+)/);
      const classNum = match?.[1] ? parseInt(match[1], 10) : null;
      if (classNum && classNum >= 1 && classNum <= 9) {
        const computed = Number(leavingYear) + (10 - classNum);
        setBatchYear(String(computed));
      }
    }
  }, [educationLevel, leftClass, leavingYear]);

  const [copiedUpi, setCopiedUpi] = useState(false);
  const handleCopyUpi = () => {
    navigator.clipboard.writeText(MANUAL_MEMBERSHIP_PAYMENT.upiId);
    setCopiedUpi(true);
    toast.success('UPI ID copied to clipboard');
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const lastHandledStateRef = useRef<RegisterState>(initialState);
  const shouldScrollToFieldRef = useRef<string | null>(null);

  // Effect to switch step and scroll/toast on state change
  useEffect(() => {
    if (state === lastHandledStateRef.current) return;
    lastHandledStateRef.current = state;

    if (state.error) {
      toast.error(state.error);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (state.fieldErrors && Object.keys(state.fieldErrors).length > 0) {
      const firstErrorKey = Object.keys(state.fieldErrors)[0];
      if (firstErrorKey) {
        const targetStep = FIELD_STEP_MAP[firstErrorKey];
        if (typeof targetStep === 'number' && targetStep !== step) {
          shouldScrollToFieldRef.current = firstErrorKey;
          setStep(targetStep);
        } else {
          setTimeout(() => {
            const errorEl = document.getElementsByName(firstErrorKey)[0] || document.getElementById(firstErrorKey);
            if (errorEl) {
              errorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
              errorEl.focus();
            }
          }, 50);
        }
      }
    }
  }, [state, step, setStep]);

  // Effect to scroll to the field error after the step changes
  useEffect(() => {
    const fieldKey = shouldScrollToFieldRef.current;
    if (fieldKey) {
      const targetStep = FIELD_STEP_MAP[fieldKey];
      if (targetStep === step) {
        shouldScrollToFieldRef.current = null;
        setTimeout(() => {
          const errorEl = document.getElementsByName(fieldKey)[0] || document.getElementById(fieldKey);
          if (errorEl) {
            errorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            errorEl.focus();
          }
        }, 50);
      }
    }
  }, [step]);

  function validateStep(s: number): Record<string, string> {
    const stepDiv = document.getElementById(`step-${s}`);
    if (!stepDiv) return {};

    const errors: Record<string, string> = {};
    const inputs = stepDiv.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      'input, select, textarea'
    );

    for (const input of Array.from(inputs)) {
      if (!input.checkValidity()) {
        const name = input.name || input.id;
        errors[name] = input.validationMessage;
      }
    }

    // Step 0 (Account) — password strength + confirm match
    if (s === 0) {
      const pwInput = stepDiv.querySelector<HTMLInputElement>('input[name="password"]');
      const cpInput = stepDiv.querySelector<HTMLInputElement>('input[name="confirmPassword"]');
      const pw = pwInput?.value ?? '';
      const cp = cpInput?.value ?? '';

      if (pw && pw.length < 8) {
        errors['password'] = 'Minimum 8 characters';
      } else if (pw && !/[A-Z]/.test(pw)) {
        errors['password'] = 'Must contain an uppercase letter';
      } else if (pw && !/[a-z]/.test(pw)) {
        errors['password'] = 'Must contain a lowercase letter';
      } else if (pw && !/[0-9]/.test(pw)) {
        errors['password'] = 'Must contain a number';
      }

      if (pw && cp && pw !== cp) {
        errors['confirmPassword'] = 'Passwords do not match';
      }
    }

    // Custom validation for proof of schooling on Step 1 (Academic)
    if (s === 1 && !hasSchoolDoc) {
      errors['school_document'] = 'Proof of schooling is required';
    }

    // Custom validation for profile photo on Step 2 (Personal)
    if (s === 2 && !hasPhoto) {
      errors['profile_photo'] = 'Profile photo is required';
    }

    // Step 3 (Professional) — terms must be accepted
    if (s === 3) {
      const termsCheckbox = stepDiv.querySelector<HTMLInputElement>('input[name="terms_accepted"]');
      if (termsCheckbox && !termsCheckbox.checked) {
        errors['terms_accepted'] = 'You must accept the terms to continue';
      }
    }

    // Custom validation for payment proof on Step 4 (Payment & Documents)
    if (s === 4 && !hasPaymentProof) {
      errors['payment_proof'] = 'Proof of payment is required';
    }

    return errors;
  }

  function getFirstInvalidStep(maxStep: number): number {
    for (let s = 0; s <= maxStep; s++) {
      const errors = validateStep(s);
      if (Object.keys(errors).length > 0) {
        return s;
      }
    }
    return maxStep;
  }

  /** Validate all visible inputs in the current step div */
  function validateCurrentStep(): boolean {
    const errors = validateStep(step);
    setClientErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function next() {
    // Validate all steps up to the current step to prevent proceeding if previous steps are invalid
    const firstInvalid = getFirstInvalidStep(step);
    if (firstInvalid < step) {
      setStep(firstInvalid);
      const errors = validateStep(firstInvalid);
      setClientErrors(errors);
      return;
    }

    if (!validateCurrentStep()) return;

    // On Step 0 (Account), check if email already exists before proceeding
    if (step === 0) {
      const emailInput = document.querySelector<HTMLInputElement>('input[name="email"]');
      const emailValue = emailInput?.value?.trim().toLowerCase();
      if (emailValue) {
        setCheckingEmail(true);
        try {
          const exists = await checkEmailExists(emailValue);
          if (exists) {
            setClientErrors({ email: 'An account with this email already exists. Please log in instead.' });
            setCheckingEmail(false);
            return;
          }
        } catch (err) {
          console.error('[register] email check failed:', err);
        }
        setCheckingEmail(false);
      }
    }

    setStep((s) => {
      const nextStep = Math.min(s + 1, STEPS.length - 1);
      if (nextStep !== s) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return nextStep;
    });
  }

  function back() {
    setClientErrors({});
    setStep((s) => Math.max(s - 1, 0));
  }

  function handleSubmit(fd: FormData) {
    // Validate all steps up to the final step to block submit if any previous step is invalid
    const firstInvalid = getFirstInvalidStep(STEPS.length - 1);
    if (firstInvalid < STEPS.length - 1) {
      setStep(firstInvalid);
      const errors = validateStep(firstInvalid);
      setClientErrors(errors);
      return;
    }

    // Validate Step 4 fields before sending to server
    if (!validateCurrentStep()) return;
    // Combine country code + phone number into a single "phone" field
    const phoneNumber = fd.get('phone_number') as string;
    const phoneCountry = fd.get('phone_country_code') as string;
    if (phoneNumber) {
      fd.set('phone', `${phoneCountry}${phoneNumber}`);
    }
    fd.delete('phone_number');
    fd.delete('phone_country_code');
    formAction(fd);
  }

  function openPaymentWhatsapp() {
    const formData = formRef.current ? new FormData(formRef.current) : null;
    const getValue = (name: string) => String(formData?.get(name) ?? '').trim();

    window.open(
      buildManualPaymentWhatsappUrl({
        fullName: getValue('full_name'),
        batchYear: getValue('passing_year'),
        phone: getValue('phone_number') ? `${getValue('phone_country_code')}${getValue('phone_number')}` : '',
      }),
      '_blank',
      'noopener,noreferrer'
    );
  }



  // Merge server errors with client errors
  const fieldErrors = { ...clientErrors, ...state.fieldErrors };

  return (
    <form ref={formRef} action={handleSubmit} onChange={saveFormDraft} onInput={saveFormDraft} noValidate className="space-y-6">
      {/* Progress */}
      <ol className="flex items-center justify-between" aria-label="Registration progress">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                i <= step ? 'bg-[#0F2557] text-white' : 'bg-slate-200 text-slate-500'
              )}
              aria-current={i === step ? 'step' : undefined}
            >
              {i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  'mx-2 h-0.5 flex-1 transition-colors',
                  i < step ? 'bg-[#0F2557]' : 'bg-slate-200'
                )}
                aria-hidden
              />
            )}
          </li>
        ))}
      </ol>
      <p className="text-center text-sm font-medium text-slate-600">
        Step {step + 1} of {STEPS.length}: {STEPS[step]}
      </p>

      {state.error && (
        <div id="register-error-alert" role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {state.error}
        </div>
      )}

      {/* Step 1 — Account */}
      <div id="step-0" className={cn('space-y-4', step !== 0 && 'hidden')}>
        <Field label="Email" name="email" type="email" autoComplete="email" maxLength={VALIDATION_LIMITS.emailMax} required error={fieldErrors?.email} />
        <Field label="Password" name="password" type="password" autoComplete="new-password" maxLength={VALIDATION_LIMITS.passwordMax} required error={fieldErrors?.password} hint="Min 8 chars, 1 uppercase, 1 number" />
        <Field label="Confirm Password" name="confirmPassword" type="password" autoComplete="new-password" maxLength={VALIDATION_LIMITS.passwordMax} required error={fieldErrors?.confirmPassword} />
      </div>

      {/* Step 2 — Academic */}
      <div id="step-1" className={cn('space-y-4', step !== 1 && 'hidden')}>
        <Field label="Full Name" name="full_name" maxLength={VALIDATION_LIMITS.nameMax} required error={fieldErrors?.full_name} />
        <div>
          <Label htmlFor="education_level">Highest level completed at DAV Khagaul <span className="text-rose-600">*</span></Label>
          <select
            id="education_level"
            name="education_level"
            required
            value={educationLevel}
            onChange={(event) => setEducationLevel(event.target.value)}
            className="mt-1.5 flex h-10 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
          >
            <option value="">Select level...</option>
            <option value="left_before_10th">Left before completing Secondary (10th)</option>
            <option value="secondary">Secondary (10th)</option>
            <option value="senior_secondary">Higher Secondary (12th)</option>
          </select>
          <FieldError message={fieldErrors?.education_level} />
        </div>
        {educationLevel === 'left_before_10th' && (
          <div>
            <Label htmlFor="left_before_schooling_class">
              Till what class did you study at DAV Khagaul? <span className="text-rose-600">*</span>
            </Label>
            <select
              id="left_before_schooling_class"
              name="left_before_schooling_class"
              required
              value={leftClass}
              onChange={(e) => setLeftClass(e.target.value)}
              className="mt-1.5 flex h-10 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
            >
              <option value="">Select class...</option>
              {LEFT_BEFORE_CLASSES.map((cls) => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
            <FieldError message={fieldErrors?.left_before_schooling_class} />
          </div>
        )}
        {educationLevel === 'senior_secondary' && (
          <div>
            <Label htmlFor="education_stream">Stream <span className="text-rose-600">*</span></Label>
            <select
              id="education_stream"
              name="education_stream"
              required
              className="mt-1.5 flex h-10 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
            >
              <option value="">Select stream...</option>
              <option value="Science">Science</option>
              <option value="Commerce">Commerce</option>
              <option value="Arts">Arts</option>
            </select>
            <FieldError message={fieldErrors?.education_stream} />
          </div>
        )}
        {educationLevel === 'secondary' && (
          <div>
            <Label htmlFor="passing_year">
              Year of passing your Secondary 10th batch <span className="text-rose-600">*</span>
            </Label>
            <p className="text-xs text-slate-500 mt-0.5">If you have completed 10th, in which year?</p>
            <select
              id="passing_year"
              name="passing_year"
              required
              className="mt-1.5 flex h-10 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
            >
              <option value="">Select year...</option>
              {BATCH_YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <FieldError message={fieldErrors?.passing_year} />
          </div>
        )}
        {educationLevel === 'senior_secondary' && (
          <>
            <div>
              <Label htmlFor="passing_year">Year of passing (Higher Secondary (12th)) <span className="text-rose-600">*</span></Label>
              <select
                id="passing_year"
                name="passing_year"
                required
                className="mt-1.5 flex h-10 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
              >
                <option value="">Select year...</option>
                {BATCH_YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <FieldError message={fieldErrors?.passing_year} />
            </div>
            <div>
              <Label htmlFor="passing_year_10th">
                Year of passing your Secondary 10th batch <span className="text-rose-600">*</span>
              </Label>
              <p className="text-xs text-slate-500 mt-0.5">If you have completed 10th, in which year?</p>
              <select
                id="passing_year_10th"
                name="passing_year_10th"
                required
                className="mt-1.5 flex h-10 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
              >
                <option value="">Select year...</option>
                {BATCH_YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <FieldError message={fieldErrors?.passing_year_10th} />
            </div>
          </>
        )}
        {educationLevel === 'left_before_10th' && (
          <>
            <div>
              <Label htmlFor="passing_year">Year of leaving DAV Khagaul <span className="text-rose-600">*</span></Label>
              <select
                id="passing_year"
                name="passing_year"
                required
                value={leavingYear}
                onChange={(e) => setLeavingYear(e.target.value)}
                className="mt-1.5 flex h-10 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
              >
                <option value="">Select year...</option>
                {BATCH_YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <FieldError message={fieldErrors?.passing_year} />
            </div>
            <div>
              <Label htmlFor="batch_year">
                10th equivalent passout batch <span className="text-rose-600">*</span>
              </Label>
              <select
                id="batch_year"
                name="batch_year"
                required
                value={batchYear}
                onChange={(e) => setBatchYear(e.target.value)}
                className="mt-1.5 flex h-10 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
              >
                <option value="">Select batch year...</option>
                {BATCH_YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Calculated automatically as Year of leaving + (10 - Class). You can modify it if needed.
              </p>
              <FieldError message={fieldErrors?.batch_year} />
            </div>
          </>
        )}
        {!educationLevel && (
          <div>
            <Label htmlFor="passing_year">Year of leaving/passing <span className="text-rose-600">*</span></Label>
            <select
              id="passing_year"
              name="passing_year"
              required
              className="mt-1.5 flex h-10 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
            >
              <option value="">Select year...</option>
              {BATCH_YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <FieldError message={fieldErrors?.passing_year} />
          </div>
        )}
        <Field label="Roll Number (optional)" name="roll_number" maxLength={VALIDATION_LIMITS.rollNumberMax} />
        {/* Proof of Schooling Upload (Compulsory) */}
        <div className="mt-4 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-5">
          <DocumentUpload
            name="school_document"
            label="Proof of Schooling (Passing Certificate, School Report Card, School Leaving Certificate, ID card etc)"
            required
            error={fieldErrors?.school_document}
            maxRawSize={10 * 1024 * 1024}
            targetCompressedSize={350 * 1024}
            onChange={(f) => setHasSchoolDoc(!!f)}
          />
        </div>
      </div>

      {/* Step 3 — Personal */}
      <div id="step-2" className={cn('space-y-4', step !== 2 && 'hidden')}>
        {/* Profile Photo — Compulsory */}
        <div>
          <Label htmlFor="profile_photo">
            Profile Photo <span className="text-rose-600">*</span>
          </Label>
          <div className="mt-1.5">
            <PhotoUploadWithCrop name="profile_photo" required error={fieldErrors?.profile_photo} onChange={(f) => setHasPhoto(!!f)} />
          </div>
        </div>

        {/* Phone — International */}
        <div>
          <Label htmlFor="phone_number">Phone</Label>
          <div className="mt-1.5 flex gap-2">
            <select
              id="phone_country_code"
              name="phone_country_code"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="flex h-10 w-[160px] shrink-0 rounded-lg border border-slate-200 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
            >
              {COUNTRY_CODES.map((cc) => (
                <option key={cc.code} value={cc.code}>{cc.label}</option>
              ))}
            </select>
            <Input
              id="phone_number"
              name="phone_number"
              type="tel"
              inputMode="numeric"
              maxLength={15}
              placeholder="9876543210"
              className="flex-1"
            />
          </div>
          <FieldError message={fieldErrors?.phone} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Current City" name="current_city" maxLength={VALIDATION_LIMITS.placeMax} />
          <Field label="State" name="current_state" maxLength={VALIDATION_LIMITS.placeMax} />
        </div>
        <Field label="Country" name="current_country" defaultValue="India" maxLength={VALIDATION_LIMITS.placeMax} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="dob_month">Date of Birth</Label>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              <select
                id="dob_month"
                value={dobMonth}
                onChange={(e) => setDobMonth(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
              >
                <option value="">Month</option>
                {MONTHS.map((m, idx) => (
                  <option key={m} value={String(idx + 1).padStart(2, '0')}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                id="dob_day"
                value={dobDay}
                onChange={(e) => setDobDay(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
              >
                <option value="">Day</option>
                {DAYS.map((d) => (
                  <option key={d} value={String(d).padStart(2, '0')}>
                    {d}
                  </option>
                ))}
              </select>
              <select
                id="dob_year"
                value={dobYear}
                onChange={(e) => setDobYear(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
              >
                <option value="">Year</option>
                {BIRTH_YEARS.map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <input
              type="hidden"
              id="date_of_birth"
              name="date_of_birth"
              value={
                dobYear && dobMonth && dobDay
                  ? `${dobYear}-${dobMonth}-${dobDay}`
                  : ''
              }
            />
            <FieldError message={fieldErrors?.date_of_birth} />
          </div>
          <div>
            <Label htmlFor="gender">Gender</Label>
            <select id="gender" name="gender" className="mt-1.5 flex h-10 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]">
              <option value="">Prefer not to say</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Step 4 — Professional */}
      <div id="step-3" className={cn('space-y-4', step !== 3 && 'hidden')}>
        <Field label="Occupation" name="occupation" maxLength={VALIDATION_LIMITS.professionalTextMax} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company / Organisation" name="company" maxLength={VALIDATION_LIMITS.professionalTextMax} />
          <Field label="Job Title" name="job_title" maxLength={VALIDATION_LIMITS.professionalTextMax} />
        </div>
        <Field label="Industry" name="industry" maxLength={VALIDATION_LIMITS.industryMax} />
        <Field label="LinkedIn URL" name="linkedin_url" type="url" maxLength={VALIDATION_LIMITS.urlMax} placeholder="https://linkedin.com/in/..." error={fieldErrors?.linkedin_url} />
        <div>
          <Label htmlFor="bio">Short bio (max 500 chars)</Label>
          <textarea
            id="bio"
            name="bio"
            rows={4}
            maxLength={VALIDATION_LIMITS.bioMax}
            className="mt-1.5 flex w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
          />
          <FieldError message={fieldErrors?.bio} />
        </div>

        <div className="space-y-2 rounded-lg bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-700">Privacy</p>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" name="hide_email" className="rounded border-slate-300" />
            Hide my email from the alumni directory
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" name="hide_phone" className="rounded border-slate-300" />
            Hide my phone from the alumni directory
          </label>
        </div>

        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input type="checkbox" name="terms_accepted" className="mt-0.5 rounded border-slate-300" />
          <span>
            I confirm I am an alumnus of DAV Khagaul and I accept the{' '}
            <a href="/terms" className="text-[#0F2557] underline">Terms</a> and{' '}
            <a href="/privacy" className="text-[#0F2557] underline">Privacy Policy</a>.
          </span>
        </label>
        <FieldError message={fieldErrors?.terms_accepted} />
      </div>

      {/* Step 5 — Payment & Documents */}
      <div id="step-4" className={cn('space-y-5', step !== 4 && 'hidden')}>

        {/* Membership Amount Selection */}
        <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-5">
          <p className="text-sm font-bold text-slate-900 mb-3">💳 Select Membership Plan</p>
          <div className="grid gap-3 sm:grid-cols-2 mb-4">
            <button
              type="button"
              onClick={() => setSelectedAmount(500)}
              className={cn(
                'rounded-xl border-2 p-4 text-center shadow-sm transition-all',
                selectedAmount === 500
                  ? 'border-[#0F2557] bg-[#0F2557]/5 ring-2 ring-[#0F2557]/20'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              )}
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Annual</p>
              <p className="mt-1 text-2xl font-bold text-[#0F2557]">₹500</p>
              <p className="text-xs text-slate-500">per year</p>
            </button>
            <button
              type="button"
              onClick={() => setSelectedAmount(5000)}
              className={cn(
                'rounded-xl border-2 p-4 text-center shadow-sm transition-all',
                selectedAmount === 5000
                  ? 'border-[#0F2557] bg-[#0F2557]/5 ring-2 ring-[#0F2557]/20'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              )}
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Lifetime</p>
              <p className="mt-1 text-2xl font-bold text-[#0F2557]">₹5,000</p>
              <p className="text-xs text-slate-500">one-time payment</p>
            </button>
          </div>
          <input type="hidden" name="selected_amount" value={selectedAmount} />
        </div>

        {/* UPI QR Code — changes based on selected amount */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="mx-auto w-full max-w-[220px] shrink-0 sm:mx-0 flex flex-col items-center">
              <div className="overflow-hidden rounded-xl border border-white bg-white p-2 shadow-sm w-full">
                <Image
                  src={selectedAmount === 500 ? MANUAL_MEMBERSHIP_PAYMENT.qrImage500 : MANUAL_MEMBERSHIP_PAYMENT.qrImage5000}
                  alt={`UPI QR code for ₹${selectedAmount.toLocaleString('en-IN')}`}
                  width={1002}
                  height={1600}
                  className="h-auto w-full rounded-lg"
                />
              </div>
              <a
                href={selectedAmount === 500 ? MANUAL_MEMBERSHIP_PAYMENT.qrImage500 : MANUAL_MEMBERSHIP_PAYMENT.qrImage5000}
                download={`davkawt-upi-qr-${selectedAmount}.jpeg`}
                className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Download className="h-3.5 w-3.5" />
                Download QR Code
              </a>
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Pay ₹{selectedAmount.toLocaleString('en-IN')} by UPI
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  Scan this QR with any UPI app, or tap the button below on mobile.
                  After payment, upload the screenshot below.
                </p>
              </div>
              <div className="rounded-lg bg-white/80 p-3 text-sm text-slate-700">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate">
                    <span className="font-medium text-slate-900">UPI ID:</span>{' '}
                    <span className="font-mono bg-slate-100/50 px-1 py-0.5 rounded text-xs select-all text-slate-800">{MANUAL_MEMBERSHIP_PAYMENT.upiId}</span>
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyUpi}
                    className="inline-flex items-center gap-1 shrink-0 rounded border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:scale-105 active:scale-95 shadow-sm"
                  >
                    {copiedUpi ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" />
                        <span className="text-emerald-600">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="mt-1.5">
                  <span className="font-medium text-slate-900">Payee:</span>{' '}
                  <span className="text-slate-800">{MANUAL_MEMBERSHIP_PAYMENT.payeeName}</span>
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  asChild
                  variant="accent"
                  className="w-full sm:w-1/2 whitespace-normal h-auto py-2.5 text-center animate-pulse hover:animate-none hover:scale-105 active:scale-95 transition-all duration-300 shadow-md hover:shadow-lg hover:shadow-amber-500/20"
                >
                  <a href={buildUpiPaymentUrl(selectedAmount)} className="flex items-center justify-center min-h-[40px] w-full">
                    Open UPI app (₹{selectedAmount.toLocaleString('en-IN')})
                  </a>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={openPaymentWhatsapp}
                  className="w-full sm:w-1/2 whitespace-normal h-auto py-2.5 text-center min-h-[40px] flex items-center justify-center"
                >
                  I have paid — WhatsApp proof
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Proof Upload */}
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 p-5">
          <DocumentUpload
            name="payment_proof"
            label="Proof of Payment"
            required
            error={fieldErrors?.payment_proof}
            maxRawSize={10 * 1024 * 1024}
            targetCompressedSize={350 * 1024}
            onChange={(f) => setHasPaymentProof(!!f)}
          />
        </div>

        <p className="text-xs leading-relaxed text-slate-600 rounded-lg bg-slate-50 p-3">
          Payment and proof of schooling is checked manually by the Trust team. Registration approval
          is completed after alumni and payment verification.
        </p>
      </div>

      {/* Nav */}
      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={back} disabled={step === 0}>
          Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button type="button" onClick={next} disabled={checkingEmail}>
            {checkingEmail ? 'Checking…' : 'Next'}
          </Button>
        ) : (
          <SubmitButton />
        )}
      </div>
    </form>
  );
}

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  hint?: string;
  error?: string;
}

function Field({ label, name, hint, error, required, ...rest }: FieldProps) {
  const { type, ...inputProps } = rest;
  const isPassword = type === 'password';

  return (
    <div>
      <Label htmlFor={name}>
        {label} {required && <span className="text-rose-600">*</span>}
      </Label>
      {isPassword ? (
        <PasswordInput
          id={name}
          name={name}
          required={required}
          aria-describedby={`${name}-error`}
          className="mt-1.5"
          {...inputProps}
        />
      ) : (
        <Input
          id={name}
          name={name}
          type={type}
          required={required}
          aria-describedby={`${name}-error`}
          className="mt-1.5"
          {...inputProps}
        />
      )}
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      <FieldError id={`${name}-error`} message={error} />
    </div>
  );
}
