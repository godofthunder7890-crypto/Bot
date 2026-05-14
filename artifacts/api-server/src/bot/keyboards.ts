import { InlineKeyboardMarkup } from "telegraf/types";

export const MAIN_MENU: InlineKeyboardMarkup = {
  inline_keyboard: [
    [
      { text: "➕ Create Reel", callback_data: "menu:create" },
      { text: "📂 Drafts", callback_data: "menu:drafts" },
    ],
    [
      { text: "📊 Analytics", callback_data: "menu:analytics" },
      { text: "📣 Promotion", callback_data: "menu:promotion" },
    ],
    [
      { text: "⚙️ Settings", callback_data: "menu:settings" },
      { text: "🔄 Refresh Status", callback_data: "menu:status" },
    ],
  ],
};

export const NICHE_KEYBOARD: InlineKeyboardMarkup = {
  inline_keyboard: [
    [
      { text: "💪 Fitness", callback_data: "niche:fitness" },
      { text: "💰 Finance", callback_data: "niche:finance" },
    ],
    [
      { text: "🍕 Food", callback_data: "niche:food" },
      { text: "✈️ Travel", callback_data: "niche:travel" },
    ],
    [
      { text: "💻 Tech", callback_data: "niche:tech" },
      { text: "🎓 Education", callback_data: "niche:education" },
    ],
    [
      { text: "💄 Beauty", callback_data: "niche:beauty" },
      { text: "🎮 Gaming", callback_data: "niche:gaming" },
    ],
    [
      { text: "🌟 Motivation", callback_data: "niche:motivation" },
      { text: "🛒 Business", callback_data: "niche:business" },
    ],
    [{ text: "🔙 Back to Menu", callback_data: "menu:main" }],
  ],
};

export const REEL_CONFIRM_KEYBOARD: InlineKeyboardMarkup = {
  inline_keyboard: [
    [
      { text: "✅ Approve & Push", callback_data: "reel:approve" },
      { text: "🔄 Regenerate", callback_data: "reel:regenerate" },
    ],
    [
      { text: "✏️ Edit Script", callback_data: "reel:edit" },
      { text: "🗑️ Delete Draft", callback_data: "reel:delete" },
    ],
    [{ text: "🔙 Main Menu", callback_data: "menu:main" }],
  ],
};

export const TOPIC_SOURCE_KEYBOARD: InlineKeyboardMarkup = {
  inline_keyboard: [
    [
      { text: "🤖 AI Trending Topics", callback_data: "topic:ai_trending" },
      { text: "✍️ Enter My Own", callback_data: "topic:custom" },
    ],
    [{ text: "🔙 Back", callback_data: "menu:main" }],
  ],
};

export const PROMOTION_KEYBOARD: InlineKeyboardMarkup = {
  inline_keyboard: [
    [
      { text: "📸 Instagram", callback_data: "promo:instagram" },
      { text: "🎵 TikTok", callback_data: "promo:tiktok" },
    ],
    [
      { text: "▶️ YouTube Shorts", callback_data: "promo:youtube" },
      { text: "🐦 Twitter/X", callback_data: "promo:twitter" },
    ],
    [
      { text: "📋 Copy Caption", callback_data: "promo:caption" },
      { text: "🔗 Get Share Link", callback_data: "promo:link" },
    ],
    [{ text: "🔙 Main Menu", callback_data: "menu:main" }],
  ],
};

export const SETTINGS_KEYBOARD: InlineKeyboardMarkup = {
  inline_keyboard: [
    [
      { text: "🎤 Change Voice", callback_data: "settings:voice" },
      { text: "🌐 Video Source", callback_data: "settings:source" },
    ],
    [
      { text: "🐙 GitHub Sync Now", callback_data: "settings:github_sync" },
      { text: "📊 API Status", callback_data: "settings:api_status" },
    ],
    [
      { text: "🗑️ Clear Failed Jobs", callback_data: "settings:clear_failed" },
      { text: "🔄 System Reset", callback_data: "settings:reset" },
    ],
    [{ text: "🔙 Main Menu", callback_data: "menu:main" }],
  ],
};

export const BACK_TO_MENU: InlineKeyboardMarkup = {
  inline_keyboard: [[{ text: "🔙 Main Menu", callback_data: "menu:main" }]],
};

export function draftsKeyboard(drafts: Array<{ id: string; topic: string; status: string }>): InlineKeyboardMarkup {
  const rows = drafts.slice(0, 8).map((d) => [
    {
      text: `${statusEmoji(d.status)} ${d.topic.slice(0, 25)}`,
      callback_data: `draft:view:${d.id}`,
    },
  ]);
  rows.push([{ text: "🔙 Main Menu", callback_data: "menu:main" }]);
  return { inline_keyboard: rows };
}

export function draftActionsKeyboard(id: string): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "✅ Approve", callback_data: `draft:approve:${id}` },
        { text: "🗑️ Delete", callback_data: `draft:delete:${id}` },
      ],
      [
        { text: "🔄 Regenerate", callback_data: `draft:regen:${id}` },
        { text: "📣 Promote", callback_data: `draft:promote:${id}` },
      ],
      [{ text: "🔙 Drafts", callback_data: "menu:drafts" }],
    ],
  };
}

function statusEmoji(status: string): string {
  const map: Record<string, string> = {
    pending: "⏳",
    generating: "🔄",
    rendering: "🎬",
    done: "✅",
    failed: "❌",
  };
  return map[status] ?? "📄";
}
