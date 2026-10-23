import type {
  UserLoginEvent,
  UserSignupEvent,
  UserModifiedEvent,
} from "@netlify/functions";
import { ownerRoles } from "../../shared/auth-policy.js";

function assignOwner(
  event: UserLoginEvent | UserSignupEvent | UserModifiedEvent,
) {
  const user = event.user;
  const current = user.appMetadata?.roles;
  const roles = ownerRoles({
    email: user.email,
    confirmedAt: user.confirmedAt,
    roles: Array.isArray(current)
      ? current.filter((role): role is string => typeof role === "string")
      : [],
  });
  return { user: { ...user, appMetadata: { ...user.appMetadata, roles } } };
}

export default {
  userLogin: assignOwner,
  userSignup: assignOwner,
  userModified: assignOwner,
};
