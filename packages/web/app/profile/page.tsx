"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button, Card, Input, Label, useToast } from "@/components/ui";
import { ApiError, api } from "@/lib/api";

export default function ProfilePage() {
  const toast = useToast();
  const [fullName, setFullName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .me()
      .then((result) => {
        setFullName(result.user.fullName);
        setMobileNumber(result.user.mobileNumber);
      })
      .catch((error) => toast.push(error instanceof ApiError ? error.message : "Unable to load profile", "error"));
  }, [toast]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const body: Record<string, string> = { fullName };
      if (newPassword) {
        body.currentPassword = currentPassword;
        body.newPassword = newPassword;
        body.confirmPassword = confirmPassword;
      }
      const result = await api.updateProfile(body);
      setFullName(result.user.fullName);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.push("Profile updated");
    } catch (error) {
      toast.push(error instanceof ApiError ? error.message : "Unable to update profile", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <h1 className="font-display text-4xl text-forest-900">Profile</h1>
      <Card className="mt-6 max-w-xl">
        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="mobile">Mobile number</Label>
            <Input id="mobile" value={mobileNumber} disabled />
          </div>
          <div>
            <Label htmlFor="current">Current password</Label>
            <Input id="current" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="next">New password</Label>
            <Input id="next" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="confirm">Confirm new password</Label>
            <Input id="confirm" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </Card>
    </AppShell>
  );
}
