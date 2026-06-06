import { describe, expect, it } from "vitest";
import {
  userFacingAuthMessage,
  userFacingPushError,
  userFacingSaveError,
} from "./userFacingError";

describe("userFacingAuthMessage", () => {
  it("maps common auth failures to friendly copy", () => {
    expect(userFacingAuthMessage("Invalid login credentials")).toBe(
      "We couldn't sign you in. Check your email and password.",
    );
    expect(userFacingAuthMessage("Email not confirmed")).toBe(
      "Please confirm your email address before signing in.",
    );
    expect(userFacingAuthMessage("User already registered")).toBe(
      "An account with this email already exists. Try signing in instead.",
    );
    expect(userFacingAuthMessage("Too many requests")).toBe(
      "Too many attempts. Please wait a moment and try again.",
    );
  });

  it("passes through safe password policy messages", () => {
    const msg = "Password should be at least 8 characters";
    expect(userFacingAuthMessage(msg)).toBe(msg);
  });

  it("sanitizes unsafe backend errors", () => {
    expect(userFacingAuthMessage("JWT expired: pgrst116")).toBe(
      "Something went wrong. Please try again.",
    );
    expect(userFacingAuthMessage("")).toBe("Something went wrong. Please try again.");
  });
});

describe("userFacingSaveError", () => {
  it("maps session, network, and upload failures", () => {
    expect(userFacingSaveError(new Error("JWT expired"), "Save failed.")).toBe(
      "Your session expired. Please sign in again and try once more.",
    );
    expect(userFacingSaveError(new Error("Failed to fetch"), "Save failed.")).toBe(
      "We couldn't reach the server. Check your connection and try again.",
    );
    expect(userFacingSaveError(new Error("Payload too large"), "Save failed.")).toBe(
      "That file is too large. Try a smaller image.",
    );
  });

  it("hides RLS errors behind the fallback", () => {
    expect(
      userFacingSaveError(
        new Error("new row violates row-level security policy"),
        "Could not save your log.",
      ),
    ).toBe("Could not save your log.");
  });

  it("returns the fallback for empty or unsafe errors", () => {
    expect(userFacingSaveError({}, "Could not save.")).toBe("Could not save.");
    expect(userFacingSaveError(new Error("{detail: sql error}"), "Could not save.")).toBe(
      "Could not save.",
    );
  });
});

describe("userFacingPushError", () => {
  it("maps push-specific failures", () => {
    expect(userFacingPushError(new Error("Push not supported"), "Push failed.")).toBe(
      "Push notifications aren't available in this browser.",
    );
    expect(userFacingPushError(new Error("Permission denied"), "Push failed.")).toBe(
      "Permission denied. Enable notifications in your browser settings.",
    );
  });
});
