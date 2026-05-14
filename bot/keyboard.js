function approvalKeyboard(reelId) {
  return {
    inline_keyboard: [
      [
        { text: 'Approve', callback_data: `approve_${reelId}` },
        { text: 'Delete', callback_data: `delete_${reelId}` },
      ],
      [
        { text: 'Schedule (1h)', callback_data: `schedule_1h_${reelId}` },
        { text: 'Schedule (24h)', callback_data: `schedule_24h_${reelId}` },
      ],
    ],
  };
}

function statsKeyboard() {
  return {
    inline_keyboard: [
      [{ text: 'Refresh Stats', callback_data: 'refresh_stats' }],
      [{ text: 'View Drafts', callback_data: 'view_drafts' }],
    ],
  };
}

module.exports = { approvalKeyboard, statsKeyboard };
