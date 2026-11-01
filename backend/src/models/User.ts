import { Schema, model } from "mongoose";

export const ROLES = ["CUSTOMER", "SELLER", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const USER_STATUSES = ["ACTIVE", "SUSPENDED"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export interface IUserSession {
  tokenHash: string;
  expiresAt: Date;
  userAgent?: string;
  createdAt: Date;
}

export interface IUser {
  name: string;
  email: string;
  phone?: string;
  passwordHash: string;
  role: Role;
  status: UserStatus;
  avatar?: string;
  lastLoginAt?: Date;
  sessions: IUserSession[];
  createdAt: Date;
  updatedAt: Date;
}

const sessionSchema = new Schema<IUserSession>(
  {
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    userAgent: { type: String, maxlength: 200 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: "CUSTOMER", index: true },
    status: { type: String, enum: USER_STATUSES, default: "ACTIVE" },
    avatar: { type: String },
    lastLoginAt: { type: Date },
    sessions: { type: [sessionSchema], default: [], select: false },
  },
  { timestamps: true },
);

// Safety net: never serialise secrets, even if a document is returned by accident.
userSchema.set("toJSON", {
  transform: (_doc, ret) => {
        const result = ret as unknown as Record<string, unknown>;
    delete result.passwordHash;
    delete result.sessions;
    delete result.__v;
    return result;
  },
});

export const User = model<IUser>("User", userSchema);