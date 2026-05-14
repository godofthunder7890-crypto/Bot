import { Context } from "telegraf";
import { PROMOTION_KEYBOARD, BACK_TO_MENU } from "../keyboards";
import { getAllDrafts } from "../../services/supabase";
import { generateCaption } from "../../services/gemini";
import { logger } from "../../lib/logger";

export async function showPromotion(ctx: Context): Promise<void> {
  await ctx.editMessageText(
    `📣 *Promotion Panel*\n\nChoose a platform to promote your latest reel:`,
    { parse_mode: "Markdown", reply_markup: PROMOTION_KEYBOARD },
  ).catch(() =>
    ctx.reply("📣 Promotion Panel", { reply_markup: PROMOTION_KEYBOARD }),
  );
}

export async function handlePromoAction(ctx: Context, action: string): Promise<void> {
  let text = "";

  try {
    const drafts = await getAllDrafts();
    const latest = drafts.find((d) => d.status === "done");

    if (!latest) {
      await ctx.answerCbQuery("No completed reels yet! Create one first.");
      return;
    }

    const fakeScript = {
      hook: "",
      body: "",
      cta: "",
      fullScript: latest.script_text ?? latest.topic,
      keywords: [latest.topic],
      duration: 30,
      hashtags: ["#viral", "#reels", "#trending", "#content", `#${latest.niche}`],
    };

    switch (action) {
      case "instagram":
        text = `📸 *Instagram Caption*\n\n${await generateCaption(fakeScript, "Instagram")}`;
        break;
      case "tiktok":
        text = `🎵 *TikTok Caption*\n\n${await generateCaption(fakeScript, "TikTok")}`;
        break;
      case "youtube":
        text = `▶️ *YouTube Shorts Description*\n\n${await generateCaption(fakeScript, "YouTube")}`;
        break;
      case "twitter":
        text = `🐦 *Twitter/X Thread*\n\n${await generateCaption(fakeScript, "Twitter")}`;
        break;
      case "caption":
        text = `📋 *Copy Caption:*\n\n${fakeScript.fullScript}\n\n${fakeScript.hashtags.join(" ")}`;
        break;
      case "link":
        text = `🔗 *Firebase Link:*\n\n${latest.firebase_url ?? "No link available — reel not uploaded yet"}`;
        break;
      default:
        text = "Unknown action";
    }
  } catch (e) {
    logger.error({ e }, "[Promotion] Action failed");
    text = "❌ Failed to generate promotion content. Try again.";
  }

  await ctx.editMessageText(text, {
    parse_mode: "Markdown",
    reply_markup: BACK_TO_MENU,
  }).catch(() => ctx.reply(text, { parse_mode: "Markdown", reply_markup: BACK_TO_MENU }));
}
