"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { applyServerErrors } from "@/lib/forms";
import { toast } from "@/store/toast-store";
import { useChangePassword, useCurrentUser, useUpdateProfile } from "../hooks";
import {
  changePasswordSchema,
  profileSchema,
  type ChangePasswordValues,
  type ProfileValues,
} from "../schemas";

const cardClass = "rounded-lg border border-line bg-surface p-6 shadow-soft";

export function ProfileForms() {
  const router = useRouter();
  const { data: user } = useCurrentUser();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? "", phone: user?.phone ?? "" },
  });

  const passwordForm = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
  });

  if (!user) return null;

  const onSaveProfile = profileForm.handleSubmit(async (values) => {
    setProfileError(null);
    try {
      const result = await updateProfile.mutateAsync({
        name: values.name,
        phone: values.phone ? values.phone : null,
      });
      profileForm.reset({ name: result.user.name, phone: result.user.phone ?? "" });
      toast.success("Profile updated");
    } catch (error) {
      setProfileError(applyServerErrors(error, profileForm.setError));
    }
  });

  const onChangePassword = passwordForm.handleSubmit(async (values) => {
    setPasswordError(null);
    try {
      await changePassword.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      toast.success("Password changed", "Please sign in again.");
      router.replace("/login");
    } catch (error) {
      setPasswordError(applyServerErrors(error, passwordForm.setError));
    }
  });

  return (
    <div className="space-y-8">
      <section className={cardClass} aria-labelledby="profile-heading">
        <h2 id="profile-heading" className="font-display text-xl">
          Profile
        </h2>
        <form onSubmit={onSaveProfile} noValidate className="mt-6 space-y-5">
          {profileError && <Alert variant="error">{profileError}</Alert>}
          <Input
            label="Full name"
            autoComplete="name"
            error={profileForm.formState.errors.name?.message}
            {...profileForm.register("name")}
          />
          <Input label="Email" value={user.email} readOnly disabled hint="Email cannot be changed." />
          <Input
            label="Phone"
            type="tel"
            autoComplete="tel"
            placeholder="0911223344"
            error={profileForm.formState.errors.phone?.message}
            {...profileForm.register("phone")}
          />
          <Button
            type="submit"
            loading={profileForm.formState.isSubmitting}
            disabled={!profileForm.formState.isDirty}
          >
            Save changes
          </Button>
        </form>
      </section>

      <section className={cardClass} aria-labelledby="password-heading">
        <h2 id="password-heading" className="font-display text-xl">
          Change password
        </h2>
        <p className="mt-1 text-sm text-muted">You will be signed out on all devices afterwards.</p>
        <form onSubmit={onChangePassword} noValidate className="mt-6 space-y-5">
          {passwordError && <Alert variant="error">{passwordError}</Alert>}
          <PasswordInput
            label="Current password"
            autoComplete="current-password"
            error={passwordForm.formState.errors.currentPassword?.message}
            {...passwordForm.register("currentPassword")}
          />
          <PasswordInput
            label="New password"
            autoComplete="new-password"
            hint="At least 8 characters, with a letter and a number."
            error={passwordForm.formState.errors.newPassword?.message}
            {...passwordForm.register("newPassword")}
          />
          <PasswordInput
            label="Confirm new password"
            autoComplete="new-password"
            error={passwordForm.formState.errors.confirmPassword?.message}
            {...passwordForm.register("confirmPassword")}
          />
          <Button type="submit" variant="secondary" loading={passwordForm.formState.isSubmitting}>
            Update password
          </Button>
        </form>
      </section>
    </div>
  );
}