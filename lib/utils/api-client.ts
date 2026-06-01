interface ApiErrorShape {
  error?: string;
}

function summarizeNonJsonResponse(status: number, text: string) {
  const trimmed = text.replace(/\s+/g, ' ').trim();

  if (!trimmed || trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) {
    return `Request failed with status ${status}. Check the server logs for details.`;
  }

  return trimmed.slice(0, 240);
}

export async function readApiResponse<T extends ApiErrorShape = ApiErrorShape>(
  response: Response
): Promise<T> {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    try {
      return (await response.json()) as T;
    } catch {
      return { error: `Invalid JSON response from server (${response.status}).` } as T;
    }
  }

  const text = await response.text().catch(() => '');
  return { error: summarizeNonJsonResponse(response.status, text) } as T;
}
