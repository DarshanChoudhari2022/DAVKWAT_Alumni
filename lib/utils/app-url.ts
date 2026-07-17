function withHttps(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

export function resolveAppUrl(): string {
  const configuredUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL;

  return trimTrailingSlash(withHttps(configuredUrl || 'http://localhost:3000'));
}

