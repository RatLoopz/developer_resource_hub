import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { nanoid } from "nanoid";

// Admin client to bypass RLS when writing the token
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// POST /api/telegram/generate-token
// Generates a unique 8-char link token for the logged-in user
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Generate short unique token (user-friendly)
    const token = "DRH-" + nanoid(8).toUpperCase();

    // Save token to profile (overwrite if exists — allows re-linking)
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ telegram_link_token: token })
      .eq("id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ token, bot_username: process.env.TELEGRAM_BOT_USERNAME || "your_bot" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET — check current linking status
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data } = await supabase
      .from("profiles")
      .select("telegram_id, telegram_link_token")
      .eq("id", user.id)
      .single();

    return NextResponse.json({
      linked: !!data?.telegram_id,
      telegram_id: data?.telegram_id || null,
      has_pending_token: !!data?.telegram_link_token,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
