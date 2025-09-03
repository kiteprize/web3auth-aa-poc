export type AuthCookie = {
  idToken: string | null;
  cachedConnector: string | null;
  currentChainId: string | null;
  connectedConnectorName: string | null;
};
