/**
 * ntfy link construction, shared so the server and the QR code agree byte for byte.
 *
 * The important detail — and the usual reason a hand-rolled QR fails to open the
 * app — is the scheme. Per ntfy's docs, Android deep linking of http/https links
 * is "very brittle and limited, which is why something like
 * `https://<host>/<topic>/subscribe` is not possible, and instead `ntfy://` links
 * have to be used". A QR encoding an https subscribe URL opens a browser at best;
 * it can never hand off to the app.
 *
 * Supported forms:
 *   ntfy://<host>/<topic>
 *   ntfy://<host>/<topic>?display=<name>
 *   ntfy://<host>/<topic>?secure=false     (self-hosted over plain http)
 */

/** ntfy allows letters, numbers, underscores and dashes, up to 64 characters. */
export const NTFY_TOPIC_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export const isValidNtfyTopic = (topic: string) => NTFY_TOPIC_PATTERN.test(topic);

/** Public page that hands off to the deep link; see `buildSubscribeLink`. */
export const SUBSCRIBE_PATH = "/subscribe";

export type NtfyLinks = {
  topic: string;
  /** `ntfy://` deep link. Only launches when tapped in a browser, not scanned. */
  appLink: string;
  /** Plain https URL to the ntfy web app, for desktop or manual subscription. */
  webLink: string;
  /**
   * https URL the QR code encodes.
   *
   * Phone camera apps only launch a small allowlist of schemes (http, https,
   * tel, mailto, geo, wifi); an `ntfy://` payload is surfaced as plain text
   * instead — which looks like "it just copies the text and doesn't redirect".
   * So the QR points at an ordinary https page in this app, which the camera
   * opens happily, and that page carries the `ntfy://` link as a tappable
   * button. Tapping a custom scheme from a browser does launch the app.
   */
  subscribeLink: string;
  /** Host (and port) the app will subscribe against. */
  host: string;
};

/**
 * https URL for the in-app hand-off page, which the QR code encodes.
 * `appOrigin` is the origin the phone can actually reach the client on.
 */
export function buildSubscribeLink(options: {
  appOrigin: string;
  topic: string;
  displayName?: string;
}): string {
  const url = new URL(`${SUBSCRIBE_PATH}/${options.topic}`, options.appOrigin);
  if (options.displayName) url.searchParams.set("display", options.displayName);
  return url.toString();
}

export function buildNtfyLinks(options: {
  /** Base URL of the ntfy server, e.g. https://ntfy.sh */
  serverUrl: string;
  topic: string;
  /** Origin the client app is reachable on, for the QR hand-off page. */
  appOrigin: string;
  /** Optional friendly name shown in the app instead of the raw topic. */
  displayName?: string;
}): NtfyLinks {
  const server = new URL(options.serverUrl);
  // `host` keeps a non-default port, which a self-hosted instance often needs.
  const host = server.host;

  const params = new URLSearchParams();
  if (options.displayName) params.set("display", options.displayName);
  // Only send `secure=false` when it is actually needed; the app defaults to https.
  if (server.protocol === "http:") params.set("secure", "false");

  const query = params.toString();
  const basePath = `${host}/${options.topic}`;

  return {
    topic: options.topic,
    appLink: `ntfy://${basePath}${query ? `?${query}` : ""}`,
    webLink: new URL(options.topic, server).toString(),
    subscribeLink: buildSubscribeLink({
      appOrigin: options.appOrigin,
      topic: options.topic,
      ...(options.displayName ? { displayName: options.displayName } : {}),
    }),
    host,
  };
}
