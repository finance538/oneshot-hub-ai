import { admin, type User } from "@netlify/identity";
import { ownerRoles } from "../../shared/auth-policy.js";

export async function persistOwnerRole(user: User): Promise<User> {
  const roles = ownerRoles(user);
  if (roles.length === (user.roles || []).length) return user;
  return admin.updateUser(user.id, {
    app_metadata: { ...user.appMetadata, roles },
  });
}
