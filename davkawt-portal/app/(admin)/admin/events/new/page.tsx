import type { Metadata } from 'next';
import { EventForm } from '../EventForm';

export const metadata: Metadata = { title: 'New Event — Admin' };

export default function NewEventPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl font-semibold tracking-tight">New Event</h1>
      <p className="mt-1 text-sm text-slate-500">Create a new event for alumni.</p>
      <div className="mt-6">
        <EventForm />
      </div>
    </div>
  );
}
