import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

const INSTAGRAM_URL_REGEX = /https?:\/\/(www\.)?instagram\.com\/(reel|p|tv)\/[A-Za-z0-9_-]+\/?(\?[^\s]*)?/gi;

// Admin Supabase client — bypasses RLS (bot has no user session)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function sendTelegramMessage(chatId: number, text: string) {
  try {
    await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
      }
    );
  } catch (err) {
    console.error("Error sending TG message:", err);
  }
}

async function fetchReelMeta(url: string) {
  try {
    const res = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`);
    const data = await res.json();
    if (data.status === "success") {
      return {
        title: data.data.title || "Instagram Reel",
        thumbnail_url: data.data.image?.url || null,
      };
    }
  } catch {}
  return { title: "Instagram Reel", thumbnail_url: null };
}

// ─── Find user by telegram_id ────────────────────────────────
async function getUserByTelegramId(telegramId: string) {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, email")
    .eq("telegram_id", telegramId)
    .single();
  return data;
}

// ─── Link telegram account using token ──────────────────────
async function linkTelegramAccount(token: string, telegramId: string, telegramName: string) {
  // Find profile with this token
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, email")
    .eq("telegram_link_token", token)
    .single();

  if (!profile) return null;

  // Save telegram_id and clear the used token
  await supabaseAdmin
    .from("profiles")
    .update({
      telegram_id: telegramId,
      telegram_link_token: null, // consume the token (one-time use)
    })
    .eq("id", profile.id);

  return profile;
}

export async function POST(req: Request) {
  try {
    // 1. Verify Telegram secret token (prevents spoofing)
    const secretToken = req.headers.get("x-telegram-bot-api-secret-token");
    if (process.env.TELEGRAM_SECRET_TOKEN && secretToken !== process.env.TELEGRAM_SECRET_TOKEN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const message = body?.message;
    if (!message) return NextResponse.json({ ok: true });

    const chatId: number = message.chat.id;
    const telegramId: string = String(message.from?.id);
    const firstName: string = message.from?.first_name || "User";
    const text: string = message.text || message.caption || "";

    console.log(`[Bot] Message from TG ID: ${telegramId}, text: ${text.slice(0, 60)}`);

    // ─── 2. Handle /start command ────────────────────────────
    if (text.startsWith("/start")) {
      const parts = text.split(" ");
      const token = parts[1]?.trim(); // e.g., /start DRH-A1B2C3D4

      if (token && token.startsWith("DRH-")) {
        // Deep-link linking flow
        const linked = await linkTelegramAccount(token, telegramId, firstName);
        if (linked) {
          await sendTelegramMessage(
            chatId,
            `✅ *Linked Successfully!*\n\nYour Telegram is now connected to *${linked.full_name || linked.email}*'s vault.\n\nSend any Instagram Reel link and it will be saved automatically! 🎬`
          );
        } else {
          await sendTelegramMessage(
            chatId,
            "❌ *Invalid or Expired Token*\n\nPlease go to your Profile page and generate a new token."
          );
        }
        return NextResponse.json({ ok: true });
      }

      // Normal /start without token
      const existingUser = await getUserByTelegramId(telegramId);
      if (existingUser) {
        await sendTelegramMessage(
          chatId,
          `👋 Welcome back, *${existingUser.full_name || existingUser.email}*!\n\nYour account is already linked. Just send Instagram Reel links to save them. 🎬`
        );
      } else {
        await sendTelegramMessage(
          chatId,
          "👋 *Welcome to Reels Vault Bot!*\n\nTo use this bot:\n\n1️⃣ Go to *developerresourcehub.vercel.app/profile*\n2️⃣ Click *'Link Telegram'*\n3️⃣ Get your unique code and send it here as:\n   `/start YOUR_CODE`\n\nOnce linked, just paste any Instagram Reel URL here! 🎬"
        );
      }
      return NextResponse.json({ ok: true });
    }

    // ─── 3. Reel saving (for linked users) ──────────────────
    // Check if telegram_id is linked to an account
    const linkedUser = await getUserByTelegramId(telegramId);
    if (!linkedUser) {
      await sendTelegramMessage(
        chatId,
        "❗ *Account Not Linked*\n\nTo save reels, first link your account:\n1. Visit your profile on the website\n2. Click *'Link Telegram'*\n3. Send `/start YOUR_CODE` here"
      );
      return NextResponse.json({ ok: true });
    }

    // ─── 4. Extract Instagram URL ────────────────────────────
    const matches = text.match(INSTAGRAM_URL_REGEX);
    if (!matches || matches.length === 0) {
      await sendTelegramMessage(chatId, "❓ Please send a valid Instagram Reel link.");
      return NextResponse.json({ ok: true });
    }

    const reelUrl = matches[0];
    await sendTelegramMessage(chatId, "⏳ _Saving to your vault..._");

    // ─── 5. Fetch metadata + Insert ─────────────────────────
    const meta = await fetchReelMeta(reelUrl);

    const { error: insertError } = await supabaseAdmin.from("reels").insert({
      user_id: linkedUser.id,
      original_url: reelUrl,
      thumbnail_url: meta.thumbnail_url,
      title: meta.title,
      notes: "Saved via Telegram",
    });

    if (insertError) {
      console.error("Insert error:", insertError);
      await sendTelegramMessage(chatId, `❌ Error: ${insertError.message}`);
    } else {
      await sendTelegramMessage(
        chatId,
        `✅ *Saved!*\n\n*${meta.title}*\n\n[View Reel](${reelUrl})`
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "Reels Vault Bot Active (Multi-User) v3.0",
    timestamp: new Date().toISOString(),
  });
}
