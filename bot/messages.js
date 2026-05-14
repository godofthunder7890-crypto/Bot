function startMessage() {
  return `*Telegram AI Reel Automation Bot*

Welcome! I create AI-powered short-form video reels automatically.

*Available Commands:*
/newreel \\[topic\\] — Generate a new AI reel
/approve \\[id\\] — Approve a draft reel
/delete \\[id\\] — Delete a draft reel
/schedule \\[id\\] — Schedule a reel for posting
/stats — View analytics and statistics

*How it works:*
1. Send /newreel with your topic
2. AI generates script, caption \\& hashtags
3. Voice \\& stock footage are added
4. Reel is rendered and sent as a draft
5. Approve or delete from the preview`;
}

function processingMessage(topic, reelId) {
  return `*Processing your reel...*

*Topic:* ${escapeMarkdown(topic)}
*ID:* \`${reelId}\`

*Steps:*
⏳ Generating script...
⏳ Creating voice...
⏳ Fetching stock footage...
⏳ Rendering video...

This takes 1-3 minutes. I'll notify you when done!`;
}

function draftReadyMessage(reel) {
  const hashtags = (reel.hashtags || []).slice(0, 5).join(' ');
  return `*Draft Ready for Review!*

*ID:* \`${reel.id.substring(0, 8)}\`
*Topic:* ${escapeMarkdown(reel.topic)}

*Script Preview:*
_${escapeMarkdown(reel.script.substring(0, 200))}..._

*Caption:*
${escapeMarkdown(reel.caption)}

*Top Hashtags:* ${escapeMarkdown(hashtags)}

Use the buttons below to approve or delete this reel:`;
}

function approvedMessage(reelId) {
  return `*Reel Approved!*

ID: \`${reelId.substring(0, 8)}\`

Your reel has been approved and is ready to publish. Use /schedule \\[id\\] to schedule it for posting.`;
}

function deletedMessage(reelId) {
  return `*Reel Deleted*

ID: \`${reelId.substring(0, 8)}\`

The draft has been permanently deleted.`;
}

function scheduledMessage(reelId, scheduledAt) {
  const dateStr = new Date(scheduledAt).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  return `*Reel Scheduled!*

ID: \`${reelId.substring(0, 8)}\`
*Scheduled for:* ${escapeMarkdown(dateStr)}

I'll send it to the channel at the scheduled time.`;
}

function statsMessage(stats) {
  if (!stats) return '*Could not load stats. Please try again.*';

  const events = Object.entries(stats.last7DaysEvents || {})
    .map(([k, v]) => `  • ${k}: ${v}`)
    .join('\n') || '  None';

  return `*Reel Analytics Dashboard*

*Total Reels:* ${stats.totalReels}

*Status Breakdown:*
  • Drafts: ${stats.drafts}
  • Approved: ${stats.approved}
  • Published: ${stats.published}
  • Deleted: ${stats.deleted}

*Last 7 Days Events:*
${events}`;
}

function errorMessage(context) {
  return `*Something went wrong*

Context: ${escapeMarkdown(context)}

Please try again or check the logs with /stats`;
}

function escapeMarkdown(text) {
  if (!text) return '';
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}

module.exports = {
  startMessage,
  processingMessage,
  draftReadyMessage,
  approvedMessage,
  deletedMessage,
  scheduledMessage,
  statsMessage,
  errorMessage,
  escapeMarkdown,
};
