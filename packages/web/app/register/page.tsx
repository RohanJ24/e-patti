"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ApiError, api, setToken } from "@/lib/api";
import { Button, Card, Input, Label, useToast } from "@/components/ui";

export default function RegisterPage() {
  const router = useRouter();
  const toast = useToast();
  const [fullName, setFullName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const result = await api.register({ fullName, mobileNumber, password, confirmPassword });
      setToken(result.accessToken);
      router.replace("/dashboard");
    } catch (error) {
      toast.push(error instanceof ApiError ? error.message : "Unable to register", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <Link href="/" className="mb-6 font-display text-3xl text-forest-900">
        E-Patti
      </Link>
      <Card>
        <h1 className="font-display text-2xl text-forest-900">Create account</h1>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="mobile">Mobile number</Label>
            <Input id="mobile" value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="confirm">Confirm password</Label>
            <Input
              id="confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating account…" : "Register"}
          </Button>
        </form>
        <p className="mt-4 text-sm text-slate-600">
          Already registered?{" "}
          <Link href="/login" className="font-semibold text-forest-800">
            Log in
          </Link>
        </p>
      </Card>
    </main>
  );
}
