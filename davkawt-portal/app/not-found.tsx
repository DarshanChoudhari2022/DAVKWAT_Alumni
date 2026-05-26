import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-7xl font-semibold text-[#0F2557]">404</p>
      <h1 className="mt-4 font-display text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 max-w-md text-slate-600">
        The page you&apos;re looking for has either moved or doesn&apos;t exist.
      </p>
      <Button asChild className="mt-6">
        <Link href="/">Back to home</Link>
      </Button>
    </div>
  );
}
