import { useEffect, useState, FormEvent } from 'react';
import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';
import { useToast } from '../components/ToastProvider';
import userService from '../services/userService';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { getCurrentUser } from '../features/auth/authSlice';

const ProfilePage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.profile?.name ?? '');
      setDepartment((user.profile as any)?.department ?? '');
    }
  }, [user]);

  const handleProfileSave = async (e: FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await userService.updateProfile({ profile: { name, department } });
      await dispatch(getCurrentUser());
      showToast('Profile updated', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message ?? 'Failed to update profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSave = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }
    if (newPassword.length < 8) {
      showToast('Password must be at least 8 characters', 'error');
      return;
    }
    setSavingPassword(true);
    try {
      await userService.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Password changed', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message ?? 'Failed to change password', 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  if (!user) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Profile"
        subtitle="Manage your account details and password."
      />

      <div className="space-y-6">
        <Card>
          <form className="space-y-4" onSubmit={handleProfileSave}>
            <h2 className="text-lg font-semibold text-gray-900">Account details</h2>
            <Input label="Email" value={user.email} disabled />
            <Input label="Role" value={user.role} disabled />
            <Input
              label="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            {user.role === 'teacher' && (
              <Input
                label="Department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            )}
            <div className="flex justify-end">
              <Button type="submit" loading={savingProfile}>
                Save changes
              </Button>
            </div>
          </form>
        </Card>

        <Card>
          <form className="space-y-4" onSubmit={handlePasswordSave}>
            <h2 className="text-lg font-semibold text-gray-900">Change password</h2>
            <Input
              label="Current password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
            <Input
              label="New password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              hint="Minimum 8 characters"
            />
            <Input
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <div className="flex justify-end">
              <Button type="submit" loading={savingPassword} variant="secondary">
                Update password
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default ProfilePage;
