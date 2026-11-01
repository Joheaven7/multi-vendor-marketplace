"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { applyServerErrors } from "@/lib/forms";
import { useRedirectIfAuthenticated, useRegister } from "../hooks";
import { registerSchema, type RegisterValues } from "../schemas";

export function RegisterForm() {
  const next = useSearchParams().get("next");
  useRedirectIfAuthenticated(next);

  const signUp = useRegister();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await signUp.mutateAsync({
        name: values.name,
        email: values.email,
        password: values.password,
        phone: values.phone ? values.phone : undefined,
      });
    } catch (error) {
      setFormError(applyServerErrors(error, setError));
    }
  });

  return (
    <div>
      <h1 className="font-display text-3xl tracking-tight">Create your account</h1>
      <p className="mt-2 text-sm text-muted">Shop from independent sellers in one checkout.</p>

      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
        {formError && <Alert variant="error">{formError}</Alert>}
        <Input
          label="Full name"
          autoComplete="name"
          error={errors.name?.message}
          {...register("name")}
        />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register("email")}
        />
        <Input
          label="Phone (optional)"
          type="tel"
          autoComplete="tel"
          placeholder="0911223344"
          error={errors.phone?.message}
          {...register("phone")}
        />
        <PasswordInput
          label="Password"
          autoComplete="new-password"
          hint="At least 8 characters, with a letter and a number."
          error={errors.password?.message}
          {...register("password")}
        />
        <PasswordInput
          label="Confirm password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />
        <Button type="submit" className="w-full" loading={isSubmitting || signUp.isSuccess}>
          Create account
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted">
        Already have an account?{" "}
        <Link
          href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
          className="font-medium text-accent hover:text-accent-hover"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}