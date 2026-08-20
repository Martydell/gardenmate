import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useUserStore } from '../stores/userStore';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { GARDEN_TYPE_OPTIONS } from '../lib/gardenTypeMeta';
import ThemePicker from '../components/shared/ThemePicker';
import NotificationRow from '../components/shared/NotificationRow';
import type { Theme, GardenType, NotificationPreferences, User } from '../types';

const TOTAL_STEPS = 7;

interface WizardState {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  gardenName: string;
  theme: Theme | null;
  gardenTypes: GardenType[];
  notifications: NotificationPreferences;
}

const initialWizardState: WizardState = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
  gardenName: '',
  theme: null,
  gardenTypes: [],
  notifications: {
    wateringRemindersEnabled: true,
    wateringTime: '08:00',
    feedingRemindersEnabled: true,
    feedingTime: '08:00',
    weeklyDigestEnabled: true,
  },
};

type AccountErrors = Partial<
  Record<'firstName' | 'lastName' | 'email' | 'password' | 'confirmPassword' | 'form', string>
>;

function validateAccountFields(state: WizardState): AccountErrors {
  const errors: AccountErrors = {};

  if (!state.firstName.trim()) errors.firstName = 'First name is required';
  if (!state.lastName.trim()) errors.lastName = 'Last name is required';

  if (!state.email.trim()) {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email.trim())) {
    errors.email = 'Enter a valid email address';
  }

  if (!state.password) {
    errors.password = 'Password is required';
  } else if (state.password.length < 6) {
    errors.password = 'Password must be at least 6 characters';
  }

  if (state.confirmPassword !== state.password) {
    errors.confirmPassword = 'Passwords do not match';
  }

  return errors;
}

function ProgressBar({ step, total }: { step: number; total: number }) {
  const percent = (step / total) * 100;

  return (
    <div className="px-6 pt-6">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
        <div
          className="h-full rounded-full bg-green-600 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-2 text-center text-xs text-neutral-400">
        Step {step} of {total}
      </p>
    </div>
  );
}

function FormField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  error,
  autoComplete,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-xl border px-4 py-2.5 focus:outline-none focus:ring-2 dark:bg-neutral-900 ${
          error
            ? 'border-red-500 focus:ring-red-100'
            : 'border-neutral-300 focus:border-green-600 focus:ring-green-100 dark:border-neutral-700'
        }`}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

function Onboarding() {
  useDocumentTitle('Welcome — GardenMate');
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [wizard, setWizard] = useState<WizardState>(initialWizardState);
  const [stepError, setStepError] = useState<string | null>(null);

  const [isSigningIn, setIsSigningIn] = useState(false);
  const [accountErrors, setAccountErrors] = useState<AccountErrors>({});
  const [isSubmittingAccount, setIsSubmittingAccount] = useState(false);

  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function updateWizard(patch: Partial<WizardState>) {
    setWizard((prev) => ({ ...prev, ...patch }));
  }

  function updateNotifications(patch: Partial<NotificationPreferences>) {
    setWizard((prev) => ({ ...prev, notifications: { ...prev.notifications, ...patch } }));
  }

  function toggleGardenType(value: GardenType) {
    setWizard((prev) => ({
      ...prev,
      gardenTypes: prev.gardenTypes.includes(value)
        ? prev.gardenTypes.filter((type) => type !== value)
        : [...prev.gardenTypes, value],
    }));
  }

  function goNext() {
    if (step === 3 && !wizard.gardenName.trim()) {
      setStepError('Give your garden a name to continue.');
      return;
    }
    if (step === 4 && !wizard.theme) {
      setStepError('Choose a theme to continue.');
      return;
    }
    if (step === 5 && wizard.gardenTypes.length === 0) {
      setStepError('Select at least one garden type to continue.');
      return;
    }
    setStepError(null);
    setStep((current) => Math.min(current + 1, TOTAL_STEPS));
  }

  function goBack() {
    setStepError(null);
    setAccountErrors({});
    setStep((current) => Math.max(current - 1, 1));
  }

  async function handleCreateAccount(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const errors = validateAccountFields(wizard);
    setAccountErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmittingAccount(true);
    const { error } = await supabase.auth.signUp({
      email: wizard.email.trim(),
      password: wizard.password,
    });
    setIsSubmittingAccount(false);

    if (error) {
      setAccountErrors({ form: error.message });
      return;
    }

    setStep(3);
  }

  async function handleSignIn(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const errors: AccountErrors = {};
    if (!wizard.email.trim()) errors.email = 'Email is required';
    if (!wizard.password) errors.password = 'Password is required';
    setAccountErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmittingAccount(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: wizard.email.trim(),
      password: wizard.password,
    });
    setIsSubmittingAccount(false);

    if (error) {
      setAccountErrors({ form: error.message });
      return;
    }

    navigate('/');
  }

  async function handleFinish() {
    setSubmitError(null);
    setIsSubmittingProfile(true);

    const fullName = `${wizard.firstName} ${wizard.lastName}`.trim();

    const { data, error } = await supabase.auth.updateUser({
      data: {
        name: fullName,
        first_name: wizard.firstName,
        last_name: wizard.lastName,
        garden_name: wizard.gardenName,
        theme: wizard.theme,
        garden_types: wizard.gardenTypes,
        notification_preferences: wizard.notifications,
      },
    });

    setIsSubmittingProfile(false);

    if (error) {
      setSubmitError(error.message);
      return;
    }

    if (data.user) {
      const profileUpdates: Partial<User> = {
        name: fullName,
        first_name: wizard.firstName,
        last_name: wizard.lastName,
        garden_name: wizard.gardenName,
        garden_types: wizard.gardenTypes,
      };
      if (wizard.theme) profileUpdates.theme = wizard.theme;
      useUserStore.getState().updateProfile(profileUpdates);
    }

    navigate('/');
  }

  function renderStep() {
    switch (step) {
      case 1:
        return (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <span className="text-6xl">🌿</span>
            <h1 className="text-3xl font-semibold">Welcome to GardenMate</h1>
            <p className="text-neutral-500">Your personal garden companion</p>
          </div>
        );

      case 2:
        return (
          <div className="flex-1 overflow-y-auto px-6">
            <h2 className="text-2xl font-semibold">
              {isSigningIn ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="mt-1 text-neutral-500">
              {isSigningIn
                ? 'Sign in to continue setting up your garden.'
                : "Let's get your garden growing."}
            </p>
            <form
              id="account-form"
              onSubmit={isSigningIn ? handleSignIn : handleCreateAccount}
              className="mt-6 space-y-4"
            >
              {!isSigningIn && (
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    id="first-name"
                    label="First name"
                    value={wizard.firstName}
                    onChange={(value) => updateWizard({ firstName: value })}
                    error={accountErrors.firstName}
                    autoComplete="given-name"
                  />
                  <FormField
                    id="last-name"
                    label="Last name"
                    value={wizard.lastName}
                    onChange={(value) => updateWizard({ lastName: value })}
                    error={accountErrors.lastName}
                    autoComplete="family-name"
                  />
                </div>
              )}
              <FormField
                id="email"
                label="Email"
                type="email"
                value={wizard.email}
                onChange={(value) => updateWizard({ email: value })}
                error={accountErrors.email}
                autoComplete="email"
              />
              <FormField
                id="password"
                label="Password"
                type="password"
                value={wizard.password}
                onChange={(value) => updateWizard({ password: value })}
                error={accountErrors.password}
                autoComplete={isSigningIn ? 'current-password' : 'new-password'}
              />
              {!isSigningIn && (
                <FormField
                  id="confirm-password"
                  label="Confirm password"
                  type="password"
                  value={wizard.confirmPassword}
                  onChange={(value) => updateWizard({ confirmPassword: value })}
                  error={accountErrors.confirmPassword}
                  autoComplete="new-password"
                />
              )}
              {accountErrors.form && <p className="text-sm text-red-600">{accountErrors.form}</p>}
            </form>
            <button
              type="button"
              onClick={() => {
                setIsSigningIn((value) => !value);
                setAccountErrors({});
              }}
              className="mt-4 text-sm text-green-700 underline dark:text-green-400"
            >
              {isSigningIn ? 'New here? Create an account' : 'Already have an account? Sign In'}
            </button>
          </div>
        );

      case 3:
        return (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <label htmlFor="garden-name" className="text-2xl font-semibold">
              What do you call your garden?
            </label>
            <input
              id="garden-name"
              type="text"
              value={wizard.gardenName}
              onChange={(e) => updateWizard({ gardenName: e.target.value })}
              placeholder="e.g. My Balcony Jungle"
              className="w-full max-w-sm rounded-xl border border-neutral-300 px-4 py-3 text-center text-lg focus:border-green-600 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
            />
          </div>
        );

      case 4:
        return (
          <div className="flex-1 overflow-y-auto px-6">
            <h2 className="text-center text-2xl font-semibold">Choose a theme</h2>
            <p className="mt-1 text-center text-neutral-500">
              Pick the look and feel of your garden
            </p>
            <div className="mt-6">
              <ThemePicker value={wizard.theme} onChange={(theme) => updateWizard({ theme })} />
            </div>
          </div>
        );

      case 5:
        return (
          <div className="flex-1 overflow-y-auto px-6">
            <h2 className="text-center text-2xl font-semibold">
              What kind of garden do you have?
            </h2>
            <p className="mt-1 text-center text-neutral-500">Select all that apply</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {GARDEN_TYPE_OPTIONS.map((option) => {
                const isSelected = wizard.gardenTypes.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleGardenType(option.value)}
                    className={`flex flex-col items-center gap-2 rounded-2xl border-2 px-4 py-5 transition ${
                      isSelected
                        ? 'border-green-600 bg-green-50 dark:bg-green-950/40'
                        : 'border-neutral-200 dark:border-neutral-800'
                    }`}
                  >
                    <span className="text-2xl">{option.emoji}</span>
                    <span className="text-sm font-medium">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 6:
        return (
          <div className="flex-1 overflow-y-auto px-6">
            <h2 className="text-center text-2xl font-semibold">Notification preferences</h2>
            <p className="mt-1 text-center text-neutral-500">
              You can change these later in settings
            </p>
            <div className="mt-6 space-y-3">
              <NotificationRow
                label="Watering reminders"
                enabled={wizard.notifications.wateringRemindersEnabled}
                onToggle={() =>
                  updateNotifications({
                    wateringRemindersEnabled: !wizard.notifications.wateringRemindersEnabled,
                  })
                }
                time={wizard.notifications.wateringTime}
                onTimeChange={(time) => updateNotifications({ wateringTime: time })}
              />
              <NotificationRow
                label="Feeding reminders"
                enabled={wizard.notifications.feedingRemindersEnabled}
                onToggle={() =>
                  updateNotifications({
                    feedingRemindersEnabled: !wizard.notifications.feedingRemindersEnabled,
                  })
                }
                time={wizard.notifications.feedingTime}
                onTimeChange={(time) => updateNotifications({ feedingTime: time })}
              />
              <NotificationRow
                label="Weekly garden digest"
                enabled={wizard.notifications.weeklyDigestEnabled}
                onToggle={() =>
                  updateNotifications({
                    weeklyDigestEnabled: !wizard.notifications.weeklyDigestEnabled,
                  })
                }
              />
            </div>
          </div>
        );

      case 7:
        return (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
            <h2 className="text-2xl font-semibold">You're all set! 🌱</h2>
            <dl className="w-full max-w-sm space-y-3 rounded-2xl border border-neutral-200 p-5 text-left dark:border-neutral-800">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-neutral-500">Garden name</dt>
                <dd className="font-medium">{wizard.gardenName || '—'}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-neutral-500">Theme</dt>
                <dd className="font-medium">{wizard.theme ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Garden types</dt>
                <dd className="mt-1 font-medium">
                  {wizard.gardenTypes.length > 0
                    ? wizard.gardenTypes
                        .map(
                          (type) =>
                            GARDEN_TYPE_OPTIONS.find((option) => option.value === type)?.label ??
                            type,
                        )
                        .join(', ')
                    : '—'}
                </dd>
              </div>
            </dl>
            {submitError && <p className="text-sm text-red-600">{submitError}</p>}
          </div>
        );

      default:
        return null;
    }
  }

  function renderFooter() {
    if (step === 1) {
      return (
        <button
          type="button"
          onClick={goNext}
          className="w-full rounded-xl bg-green-600 py-3 font-medium text-white"
        >
          Get Started
        </button>
      );
    }

    if (step === 2) {
      return (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={goBack}
            className="flex-1 rounded-xl border border-neutral-300 py-3 font-medium dark:border-neutral-700"
          >
            Back
          </button>
          <button
            type="submit"
            form="account-form"
            disabled={isSubmittingAccount}
            className="flex-1 rounded-xl bg-green-600 py-3 font-medium text-white disabled:opacity-60"
          >
            {isSubmittingAccount ? 'Please wait…' : isSigningIn ? 'Sign In' : 'Create Account'}
          </button>
        </div>
      );
    }

    if (step === 7) {
      return (
        <button
          type="button"
          onClick={handleFinish}
          disabled={isSubmittingProfile}
          className="w-full rounded-xl bg-green-600 py-3 font-medium text-white disabled:opacity-60"
        >
          {isSubmittingProfile ? 'Saving…' : "Let's Grow!"}
        </button>
      );
    }

    return (
      <div className="flex gap-3">
        <button
          type="button"
          onClick={goBack}
          className="flex-1 rounded-xl border border-neutral-300 py-3 font-medium dark:border-neutral-700"
        >
          Back
        </button>
        <button
          type="button"
          onClick={goNext}
          className="flex-1 rounded-xl bg-green-600 py-3 font-medium text-white"
        >
          Next
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <div className="flex min-h-[calc(100svh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white shadow-[0_8px_40px_-8px_rgba(0,0,0,0.15)] dark:bg-neutral-900 sm:min-h-[42rem]">
        <ProgressBar step={step} total={TOTAL_STEPS} />
        <div className="flex flex-1 flex-col py-6">{renderStep()}</div>
        <div className="border-t border-neutral-200 p-6 dark:border-neutral-800">
          {stepError && <p className="mb-3 text-center text-sm text-red-600">{stepError}</p>}
          {renderFooter()}
        </div>
      </div>
    </div>
  );
}

export default Onboarding;
