import type { Metadata } from 'next';
import { EventForm } from '../EventForm';

export const metadata: Metadata = { title: 'New Event — Admin' };

export default function NewEventPage() {
  return (
    <div className="mx-auto max-w-3xl px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
      <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">New Event</h1>
      <p className="mt-1 text-sm text-slate-500">Create a new event for alumni.</p>
      <div className="mt-6">
        <EventForm />
      </div>
    </div>
  );
}
