import type { HydratedDocument } from "mongoose";
import { User, type IUser, type Role, type UserStatus } from "../models/User";
import type {
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
} from "../validators/auth.validator";
import { AppError } from "../utils/AppError";
import { getDummyHash, hashPassword, verifyPassword } from "../utils/password";
import {
  REFRESH_TTL_SECONDS,
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/tokens";

const MAX_SESSIONS = 5;

type UserDocument = HydratedDocument<IUser>;

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  status: UserStatus;
  avatar?: string;
  createdAt: Date;
};

export type AuthResult = {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
};

export function toPublicUser(user: UserDocument): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    avatar: user.avatar,
    createdAt: user.createdAt,
  };
}

/** Creates a new session: issues both tokens and stores the refresh token's hash. */
async function startSession(user: UserDocument, userAgent?: string) {
  const refreshToken = signRefreshToken(user.id);
  const now = Date.now();

  const active = user.sessions.filter((session) => session.expiresAt.getTime() > now);
  active.push({
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(now + REFRESH_TTL_SECONDS * 1000),
    userAgent,
    createdAt: new Date(now),
  });

  user.sessions = active.slice(-MAX_SESSIONS);
  await user.save();

  return { accessToken: signAccessToken(user.id), refreshToken };
}

export async function register(input: RegisterInput, userAgent?: string): Promise<AuthResult> {
  const exists = await User.exists({ email: input.email });
  if (exists) throw AppError.conflict("An account with this email already exists");

  const user = await User.create({
    name: input.name,
    email: input.email,
    phone: input.phone,
    passwordHash: await hashPassword(input.password),
  });

  const tokens = await startSession(user, userAgent);
  return { user: toPublicUser(user), ...tokens };
}

export async function login(input: LoginInput, userAgent?: string): Promise<AuthResult> {
  const user = await User.findOne({ email: input.email }).select("+passwordHash +sessions");

  const passwordHash = user?.passwordHash ?? (await getDummyHash());
  const passwordMatches = await verifyPassword(input.password, passwordHash);

  if (!user || !passwordMatches) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Incorrect email or password");
  }
  if (user.status !== "ACTIVE") {
    throw new AppError(403, "ACCOUNT_SUSPENDED", "This account has been suspended");
  }

  user.lastLoginAt = new Date();
  const tokens = await startSession(user, userAgent);
  return { user: toPublicUser(user), ...tokens };
}

/**
 * Rotates the refresh token. If a token that is not in the user's session list is
 * presented (already used, or stolen and replayed), every session is revoked.
 */
export async function refresh(token: string | undefined, userAgent?: string): Promise<AuthResult> {
  if (!token) throw AppError.unauthorized("Session expired");

  const userId = verifyRefreshToken(token);
  const user = await User.findById(userId).select("+sessions");
  if (!user || user.status !== "ACTIVE") throw AppError.unauthorized("Session expired");

  const tokenHash = hashToken(token);
  const now = Date.now();
  const index = user.sessions.findIndex(
    (session) => session.tokenHash === tokenHash && session.expiresAt.getTime() > now,
  );

  if (index === -1) {
    user.sessions = [];
    await user.save();
    throw AppError.unauthorized("Session expired");
  }

  user.sessions.splice(index, 1);
  const tokens = await startSession(user, userAgent);
  return { user: toPublicUser(user), ...tokens };
}

export async function logout(token: string | undefined): Promise<void> {
  if (!token) return;
  try {
    const userId = verifyRefreshToken(token);
    await User.updateOne({ _id: userId }, { $pull: { sessions: { tokenHash: hashToken(token) } } });
  } catch {
    // Invalid or expired token: there is nothing to revoke.
  }
}

export async function getMe(userId: string): Promise<PublicUser> {
  const user = await User.findById(userId);
  if (!user) throw AppError.unauthorized("This account no longer exists");
  return toPublicUser(user);
}

export async function updateProfile(userId: string, input: UpdateProfileInput): Promise<PublicUser> {
  const user = await User.findById(userId);
  if (!user) throw AppError.notFound("User not found");

  if (input.name !== undefined) user.name = input.name;
  if (input.phone !== undefined) user.phone = input.phone ?? undefined;

  await user.save();
  return toPublicUser(user);
}

/** Changes the password and signs the user out of every device. */
export async function changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
  const user = await User.findById(userId).select("+passwordHash +sessions");
  if (!user) throw AppError.notFound("User not found");

  const matches = await verifyPassword(input.currentPassword, user.passwordHash);
  if (!matches) throw new AppError(400, "INVALID_PASSWORD", "Current password is incorrect");

  user.passwordHash = await hashPassword(input.newPassword);
  user.sessions = [];
  await user.save();
}