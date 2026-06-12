export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * Generate login URL at runtime so redirect URI reflects the current origin.
 *
 * @param returnPath  Optional path to return to after OAuth completes (e.g. "/the-press").
 *                    Defaults to "/" if omitted.
 *
 * The `state` param encodes a JSON object: { redirectUri, returnPath }
 * The Manus platform passes `state` back unchanged to the callback URL,
 * where the client-side OAuthCallback component reads it and navigates to returnPath.
 */
export const getLoginUrl = (returnPath?: string) => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const statePayload = JSON.stringify({
    redirectUri,
    returnPath: returnPath ?? window.location.pathname,
  });
  const state = btoa(statePayload);

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};
