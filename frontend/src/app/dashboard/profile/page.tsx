import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { ProfileForms } from "@/features/auth/components/profile-forms";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <>
      <PageHeader title="Profile" description="Manage your personal details and password." />
      <ProfileForms />
    </>
  );
}