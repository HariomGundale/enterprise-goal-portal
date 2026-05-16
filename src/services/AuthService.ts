import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import {
  buildTokenPayload,
  clearAuthCookies,
  setAuthCookies,
  signAccessToken,
  signRefreshToken,
  toSessionUser,
  verifyRefreshToken,
} from "@/lib/auth";
import { ApiError } from "@/lib/api-error";
import { User } from "@/models/User";
import type { SessionUser } from "@/types";

export class AuthService {
  static async login(
    email: string,
    password: string,
  ): Promise<{ user: SessionUser; accessToken: string; refreshToken: string }> {
    await connectDB();

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
      "+passwordHash",
    );

    if (!user || !user.isActive) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "Email or password incorrect");
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "Email or password incorrect");
    }

    user.lastLogin = new Date();
    await user.save();

    const tokenPayload = buildTokenPayload(user);
    const accessToken = await signAccessToken(tokenPayload);
    const refreshToken = await signRefreshToken(tokenPayload);

    await setAuthCookies(accessToken, refreshToken);

    return {
      user: toSessionUser(user),
      accessToken,
      refreshToken,
    };
  }

  static async logout(): Promise<void> {
    await clearAuthCookies();
  }

  static async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = await verifyRefreshToken(refreshToken);
    if (!payload) {
      throw new ApiError(401, "INVALID_TOKEN", "Refresh token is invalid or expired");
    }

    await connectDB();
    const user = await User.findById(payload.userId);
    if (!user || !user.isActive) {
      throw new ApiError(401, "INVALID_TOKEN", "User session is no longer valid");
    }

    const tokenPayload = buildTokenPayload(user);
    const newAccessToken = await signAccessToken(tokenPayload);
    const newRefreshToken = await signRefreshToken(tokenPayload);

    await setAuthCookies(newAccessToken, newRefreshToken);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  static async getCurrentUser(userId: string): Promise<SessionUser | null> {
    await connectDB();
    const user = await User.findById(userId);
    if (!user || !user.isActive) return null;
    return toSessionUser(user);
  }
}
