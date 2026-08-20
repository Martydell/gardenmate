import { useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { supabase, uploadAvatarPhoto } from '../lib/supabase';
import { notifyError } from '../lib/errorHandling';
import { useUserStore } from '../stores/userStore';
import { usePlants } from '../hooks/usePlants';
import { useCareLog } from '../hooks/useCareLog';
import { useSpaces } from '../hooks/useSpaces';
import { useAchievements } from '../hooks/useAchievements';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { GARDEN_TYPE_OPTIONS } from '../lib/gardenTypeMeta';
import { todayDateString } from '../lib/careTaskMeta';
import { plantsToCsv, downloadCsv } from '../lib/csv';
import AvatarUploader from '../components/profile/AvatarUploader';
import ThemePickerModal from '../components/profile/ThemePickerModal';
import GardenTypesModal from '../components/profile/GardenTypesModal';
import AchievementsGrid from '../components/profile/AchievementsGrid';
import DeleteAccountDialog from '../components/profile/DeleteAccountDialog';
import NotificationRow from '../components/shared/NotificationRow';
import PageHeaderBand from '../components/layout/PageHeaderBand';
import type { GardenType, NotificationPreferences, Theme, User } from '../types';

const DEFAULT_NOTIFICATIONS: NotificationPreferences = {
  wateringRemindersEnabled: true,
  wateringTime: '08:00',
  feedingRemindersEnabled: true,
  feedingTime: '08:00',
  weeklyDigestEnabled: true,
};

async function persistUserMetadata(updates: Partial<User>): Promise<boolean> {
  try {
    const { error } = await supabase.auth.updateUser({ data: updates });
    if (error) {
      notifyError(error.message);
      return false;
    }
    useUserStore.getState().updateProfile(updates);
    return true;
  } catch {
    notifyError();
    return false;
  }
}

function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="mb-2 px-1 font-semibold">{title}</h2>
      <div className="rounded-2xl border border-neutral-100 bg-white px-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] dark:border-neutral-800 dark:bg-neutral-900">
        {children}
      </div>
    </div>
  );
}

function SettingsRow({
  label,
  value,
  onClick,
  labelClassName,
}: {
  label: string;
  value?: string;
  onClick: () => void;
  labelClassName?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between border-b border-neutral-100 py-3.5 text-left last:border-b-0 dark:border-neutral-800/60"
    >
      <span className={`font-medium ${labelClassName ?? ''}`}>{label}</span>
      <span className="flex items-center gap-1.5 text-sm text-neutral-500">
        {value && <span className="max-w-[10rem] truncate">{value}</span>}
        <ChevronRight className="h-4 w-4" />
      </span>
    </button>
  );
}

function Profile() {
  useDocumentTitle('Profile — GardenMate');
  const user = useUserStore((state) => state.user);

  const { plants, isLoading: plantsLoading } = usePlants();
  const { logs, isLoading: logsLoading } = useCareLog();
  const { spaces, isLoading: spacesLoading } = useSpaces();
  const isAchievementDataReady = !plantsLoading && !logsLoading && !spacesLoading;
  const { achievements, isLoading: achievementsLoading } = useAchievements(
    plants,
    logs,
    spaces.length,
    isAchievementDataReady,
  );

  const [nameDraft, setNameDraft] = useState(user?.name ?? '');
  const [gardenNameDraft, setGardenNameDraft] = useState(user?.garden_name ?? '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const isProfileDirty =
    nameDraft.trim() !== (user?.name ?? '') || gardenNameDraft.trim() !== (user?.garden_name ?? '');

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isGardenTypesModalOpen, setIsGardenTypesModalOpen] = useState(false);

  const [notifications, setNotifications] = useState<NotificationPreferences>(
    user?.notification_preferences ?? DEFAULT_NOTIFICATIONS,
  );
  const [notificationsError, setNotificationsError] = useState<string | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  async function handleSaveProfile() {
    setIsSavingProfile(true);
    setProfileError(null);
    const success = await persistUserMetadata({
      name: nameDraft.trim(),
      garden_name: gardenNameDraft.trim(),
    });
    setIsSavingProfile(false);
    if (!success) {
      setProfileError('Something went wrong saving your changes. Please try again.');
    }
  }

  async function handleAvatarSelect(file: File) {
    if (!user) return;
    setIsUploadingAvatar(true);
    setAvatarError(null);
    const url = await uploadAvatarPhoto(user.id, file);
    if (!url) {
      setIsUploadingAvatar(false);
      setAvatarError('Something went wrong uploading your photo. Please try again.');
      return;
    }
    const success = await persistUserMetadata({ avatar_url: url });
    setIsUploadingAvatar(false);
    if (!success) {
      setAvatarError('Something went wrong saving your photo. Please try again.');
    }
  }

  async function handleSaveTheme(theme: Theme) {
    return persistUserMetadata({ theme });
  }

  async function handleSaveGardenTypes(types: GardenType[]) {
    return persistUserMetadata({ garden_types: types });
  }

  async function updateNotifications(patch: Partial<NotificationPreferences>) {
    const next = { ...notifications, ...patch };
    setNotifications(next);
    setNotificationsError(null);
    const success = await persistUserMetadata({ notification_preferences: next });
    if (!success) {
      setNotificationsError('Something went wrong saving your notification settings.');
    }
  }

  function handleExportCsv() {
    const csv = plantsToCsv(plants);
    downloadCsv(`gardenmate-plants-${todayDateString()}.csv`, csv);
  }

  async function handleDeleteAccount(): Promise<boolean> {
    if (!user) return false;

    try {
      const [{ error: plantsError }, { error: spacesError }, { error: achievementsError }] =
        await Promise.all([
          supabase.from('plants').delete().eq('user_id', user.id),
          supabase.from('garden_spaces').delete().eq('user_id', user.id),
          supabase.from('achievements').delete().eq('user_id', user.id),
        ]);

      if (plantsError || spacesError || achievementsError) {
        notifyError();
        return false;
      }

      await supabase.auth.signOut();
      return true;
    } catch {
      notifyError();
      return false;
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  const gardenTypesLabel =
    user && user.garden_types.length > 0
      ? user.garden_types
          .map((type) => GARDEN_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type)
          .join(', ')
      : 'None set';

  return (
    <div className="space-y-6 pb-24">
      <PageHeaderBand>
        <div className="flex items-start gap-4">
          <AvatarUploader
            avatarUrl={user?.avatar_url ?? null}
            displayName={user?.name || user?.email || ''}
            isUploading={isUploadingAvatar}
            onSelectFile={handleAvatarSelect}
          />
          <div className="min-w-0 flex-1 space-y-3 pt-1">
            <div>
              <label htmlFor="profile-name" className="mb-1 block text-xs font-medium text-neutral-500">
                Display name
              </label>
              <input
                id="profile-name"
                type="text"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                className="w-full rounded-lg border border-transparent bg-transparent px-0 text-lg font-semibold focus:border-neutral-300 focus:bg-white focus:px-2 focus:py-1 focus:outline-none dark:focus:border-neutral-700 dark:focus:bg-neutral-900"
              />
            </div>
            <div>
              <label
                htmlFor="profile-garden-name"
                className="mb-1 block text-xs font-medium text-neutral-500"
              >
                Garden name
              </label>
              <input
                id="profile-garden-name"
                type="text"
                value={gardenNameDraft}
                onChange={(e) => setGardenNameDraft(e.target.value)}
                className="w-full rounded-lg border border-transparent bg-transparent px-0 text-sm text-neutral-600 focus:border-neutral-300 focus:bg-white focus:px-2 focus:py-1 focus:outline-none dark:text-neutral-400 dark:focus:border-neutral-700 dark:focus:bg-neutral-900"
              />
            </div>
          </div>
        </div>
      </PageHeaderBand>

      {avatarError && <p className="px-4 text-sm text-red-600">{avatarError}</p>}

      {isProfileDirty && (
        <div className="px-4">
          {profileError && <p className="mb-2 text-sm text-red-600">{profileError}</p>}
          <button
            type="button"
            onClick={handleSaveProfile}
            disabled={isSavingProfile}
            className="w-full rounded-xl bg-green-600 py-2.5 font-medium text-white disabled:opacity-60"
          >
            {isSavingProfile ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      )}

      <div className="space-y-6 px-4">
        <SettingsSection title="My Garden">
          <SettingsRow
            label="Garden name"
            value={user?.garden_name || 'Not set'}
            onClick={() => document.getElementById('profile-garden-name')?.focus()}
          />
          <SettingsRow
            label="Theme"
            value={user?.theme ?? 'Not set'}
            onClick={() => setIsThemeModalOpen(true)}
          />
          <SettingsRow
            label="Garden types"
            value={gardenTypesLabel}
            onClick={() => setIsGardenTypesModalOpen(true)}
          />
        </SettingsSection>

        <div>
          <h2 className="mb-2 px-1 font-semibold">Notifications</h2>
          <div className="space-y-3">
            <NotificationRow
              label="Watering reminders"
              enabled={notifications.wateringRemindersEnabled}
              onToggle={() =>
                updateNotifications({ wateringRemindersEnabled: !notifications.wateringRemindersEnabled })
              }
              time={notifications.wateringTime}
              onTimeChange={(time) => updateNotifications({ wateringTime: time })}
            />
            <NotificationRow
              label="Feeding reminders"
              enabled={notifications.feedingRemindersEnabled}
              onToggle={() =>
                updateNotifications({ feedingRemindersEnabled: !notifications.feedingRemindersEnabled })
              }
              time={notifications.feedingTime}
              onTimeChange={(time) => updateNotifications({ feedingTime: time })}
            />
            <NotificationRow
              label="Weekly digest"
              enabled={notifications.weeklyDigestEnabled}
              onToggle={() =>
                updateNotifications({ weeklyDigestEnabled: !notifications.weeklyDigestEnabled })
              }
            />
            {notificationsError && <p className="text-sm text-red-600">{notificationsError}</p>}
          </div>
        </div>

        <SettingsSection title="Data">
          <SettingsRow label="Export my data" value="CSV" onClick={handleExportCsv} />
          <SettingsRow
            label="Delete my account"
            labelClassName="text-red-600"
            onClick={() => setIsDeleteDialogOpen(true)}
          />
        </SettingsSection>

        <div>
          <h2 className="mb-2 px-1 font-semibold">Your Achievements 🏆</h2>
          {achievementsLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-32 animate-pulse rounded-2xl bg-neutral-200 dark:bg-neutral-800"
                />
              ))}
            </div>
          ) : (
            <AchievementsGrid achievements={achievements} />
          )}
        </div>

        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={handleSignOut}
            className="text-sm text-neutral-500 underline underline-offset-2 hover:text-neutral-700 dark:hover:text-neutral-300"
          >
            Sign out
          </button>
        </div>
      </div>

      <ThemePickerModal
        open={isThemeModalOpen}
        currentTheme={user?.theme ?? null}
        onClose={() => setIsThemeModalOpen(false)}
        onSave={handleSaveTheme}
      />
      <GardenTypesModal
        open={isGardenTypesModalOpen}
        currentTypes={user?.garden_types ?? []}
        onClose={() => setIsGardenTypesModalOpen(false)}
        onSave={handleSaveGardenTypes}
      />
      <DeleteAccountDialog
        open={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteAccount}
      />
    </div>
  );
}

export default Profile;
