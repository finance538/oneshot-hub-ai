import { ownerRoles } from "../../shared/auth-policy.js";

// The minimal account shape the app reads from its own user store.
export type AppUser = {
  id: string;
  email?: string;
  name?: string;
  roles?: string[];
  userMetadata?: Record<string, unknown>;
  appMetadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
  confirmedAt?: string;
};

// The owner's admin role is derived from the confirmed owner email on every read,
// so nothing has to be written back to an identity provider.
export async function persistOwnerRole<T extends AppUser>(user: T): Promise<T> {
  const roles = ownerRoles(user);
  return roles.length === (user.roles || []).length ? user : { ...user, roles };
}
