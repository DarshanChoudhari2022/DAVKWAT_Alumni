import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { CategoryForm } from './CategoryForm';

export const metadata: Metadata = { title: 'New Forum Category — Admin' };

export default function NewCategoryPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/admin/forum"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-[#0F2557]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Forum Management
      </Link>
      <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight">
        New Forum Category
      </h1>
      <div className="mt-6">
        <CategoryForm />
      </div>
    </div>
  );
}
