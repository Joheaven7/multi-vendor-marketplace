import { Logo } from "@/components/layout/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-ink p-12 text-white lg:flex">
        <Logo className="text-white" />
        <blockquote className="max-w-md font-display text-3xl leading-snug">
          Discover things made by people who care how they are made.
        </blockquote>
        <p className="text-sm text-white/50">A multi-vendor marketplace</p>
      </aside>
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <Logo className="mb-10 lg:hidden" />
        <div className="mx-auto w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}