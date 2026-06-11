import { createClient } from "@/src/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * UGC moderation notifications (Apple Guideline 1.2). Fired after a user reports a
 * log or blocks another user. The report/block row is the source of truth (written
 * client-side under RLS); this route only emails support@gellog.app so a human can
 * review. Sends via Resend when RESEND_API_KEY is set, otherwise logs to the server
 * console so v1 works without external config.
 */

const SUPPORT_EMAIL = "support@gellog.app";

type ReportBody = {
  kind: "report" | "block";
  reason?: string;
  reportedLogId?: string;
  blockedUserId?: string;
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: ReportBody;
  try {
    body = (await req.json()) as ReportBody;
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (body.kind !== "report" && body.kind !== "block") {
    return NextResponse.json({ error: "invalid kind" }, { status: 400 });
  }

  const subject =
    body.kind === "report"
      ? "Gellog: content report submitted"
      : "Gellog: user blocked";

  const lines =
    body.kind === "report"
      ? [
          `A user reported a log on Gellog.`,
          `Reporter: ${user.id} (${user.email ?? "no email"})`,
          `Reported log: ${body.reportedLogId ?? "unknown"}`,
          `Reason: ${body.reason ?? "unspecified"}`,
        ]
      : [
          `A user blocked another user on Gellog.`,
          `Blocker: ${user.id} (${user.email ?? "no email"})`,
          `Blocked user: ${body.blockedUserId ?? "unknown"}`,
        ];

  const text = lines.join("\n");
  const apiKey = process.env.RESEND_API_KEY;

  if (apiKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM ?? "Gellog <noreply@gellog.app>",
          to: SUPPORT_EMAIL,
          subject,
          text,
        }),
      });
      if (!res.ok) {
        console.error("report-content: Resend failed", await res.text());
      }
    } catch (err) {
      console.error("report-content: Resend error", err);
    }
  } else {
    console.log(`[report-content] ${subject}\n${text}`);
  }

  return NextResponse.json({ ok: true });
}
