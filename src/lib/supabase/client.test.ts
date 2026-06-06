import { describe, expect, it } from "vitest";
import {
  clearSupabaseBrowserSession,
  hasValidRefreshToken,
  shouldClearSessionAfterTokenResponse,
} from "./client";

const TOKEN_URL = "https://example.supabase.co/auth/v1/token?grant_type=refresh_token";

describe("shouldClearSessionAfterTokenResponse", () => {
  it("returns false for non-token URLs", () => {
    expect(
      shouldClearSessionAfterTokenResponse("https://example.supabase.co/rest/v1/logs", {
        error: "invalid_grant",
        error_description: "Refresh token expired",
      }),
    ).toBe(false);
  });

  it("returns false when the body is missing or not an object", () => {
    expect(shouldClearSessionAfterTokenResponse(TOKEN_URL, null)).toBe(false);
    expect(shouldClearSessionAfterTokenResponse(TOKEN_URL, "error")).toBe(false);
  });

  it("does not clear session on wrong-password invalid_grant responses", () => {
    expect(
      shouldClearSessionAfterTokenResponse(TOKEN_URL, {
        error: "invalid_grant",
        error_description: "Invalid login credentials",
      }),
    ).toBe(false);
  });

  it("does not clear session when error_description mentions invalid credentials", () => {
    expect(
      shouldClearSessionAfterTokenResponse(TOKEN_URL, {
        error: "invalid_grant",
        error_description: "The provided invalid credentials were rejected",
      }),
    ).toBe(false);
  });

  it("clears session when the refresh token is expired", () => {
    expect(
      shouldClearSessionAfterTokenResponse(TOKEN_URL, {
        error: "invalid_grant",
        error_description: "Refresh token expired",
      }),
    ).toBe(true);
  });

  it("clears session when error_description mentions refresh_token", () => {
    expect(
      shouldClearSessionAfterTokenResponse(TOKEN_URL, {
        error: "invalid_grant",
        error_description: "Invalid refresh_token",
      }),
    ).toBe(true);
  });

  it("clears session for invalid_grant errors that mention refresh", () => {
    expect(
      shouldClearSessionAfterTokenResponse(TOKEN_URL, {
        error: "invalid_grant",
        error_description: "Unable to refresh session",
      }),
    ).toBe(true);
  });

  it("does not clear session for unrelated token errors", () => {
    expect(
      shouldClearSessionAfterTokenResponse(TOKEN_URL, {
        error: "invalid_request",
        error_description: "Missing grant type",
      }),
    ).toBe(false);
  });

  it("is case-insensitive for refresh-token and credential messages", () => {
    expect(
      shouldClearSessionAfterTokenResponse(TOKEN_URL, {
        error: "invalid_grant",
        error_description: "REFRESH TOKEN EXPIRED",
      }),
    ).toBe(true);

    expect(
      shouldClearSessionAfterTokenResponse(TOKEN_URL, {
        error: "invalid_grant",
        error_description: "Invalid Login Credentials",
      }),
    ).toBe(false);
  });

  it("does not clear session for bare invalid_grant without refresh or credentials hints", () => {
    expect(
      shouldClearSessionAfterTokenResponse(TOKEN_URL, {
        error: "invalid_grant",
        error_description: "Malformed request",
      }),
    ).toBe(false);

    expect(
      shouldClearSessionAfterTokenResponse(TOKEN_URL, {
        error: "invalid_grant",
        error_description: "",
      }),
    ).toBe(false);
  });
});

describe("hasValidRefreshToken", () => {
  it("accepts top-level refresh_token strings", () => {
    expect(hasValidRefreshToken({ refresh_token: "abc" })).toBe(true);
  });

  it("accepts nested currentSession refresh tokens", () => {
    expect(hasValidRefreshToken({ currentSession: { refresh_token: "abc" } })).toBe(true);
  });

  it("rejects empty, missing, or non-object values", () => {
    expect(hasValidRefreshToken(null)).toBe(false);
    expect(hasValidRefreshToken({ refresh_token: "" })).toBe(false);
    expect(hasValidRefreshToken({ currentSession: { refresh_token: "" } })).toBe(false);
    expect(hasValidRefreshToken("token")).toBe(false);
  });
});

describe("clearSupabaseBrowserSession", () => {
  it("removes sb-* keys from localStorage and auth cookies", () => {
    localStorage.setItem("sb-test-auth-token", JSON.stringify({ refresh_token: "abc" }));
    localStorage.setItem("keep-me", "1");
    document.cookie = "sb-access-token=abc; Path=/";
    document.cookie = "other=1; Path=/";

    clearSupabaseBrowserSession();

    expect(localStorage.getItem("sb-test-auth-token")).toBeNull();
    expect(localStorage.getItem("keep-me")).toBe("1");
    expect(document.cookie.includes("sb-access-token=abc")).toBe(false);
  });
});
