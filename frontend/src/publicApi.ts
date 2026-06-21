import type { GuestMenu } from './types';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function fetchGuestMenu(qrToken: string): Promise<GuestMenu> {
  const res = await fetch(`/api/public/menu/${qrToken}`);

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = body.message || `Menu unavailable (${res.status})`;
    throw new ApiError(msg, res.status);
  }

  return res.json();
}

export function guestMenuUrl(qrToken: string): string {
  return `${window.location.origin}/m/${qrToken}`;
}
