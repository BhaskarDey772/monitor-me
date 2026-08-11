/**
 * Minimal, transport-safe user shape. Deliberately hand-written rather than
 * inferred from Prisma so the client bundle never depends on database types and
 * no extra columns (hashes, tokens) can leak into a response by accident.
 */
export type PublicUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: string;
  /**
   * True while the account still has the password the provisioning script
   * generated. The API refuses everything except the password-change endpoint
   * until it is cleared.
   */
  mustChangePassword: boolean;
};

export type SessionInfo = {
  user: PublicUser;
  expiresAt: string;
};
