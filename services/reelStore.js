const { getSupabase } = require('../config/supabase');
const logger = require('./logger');

async function createReel(topic, chatId) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('reels')
    .insert({ topic, created_by_chat_id: String(chatId), status: 'pending' })
    .select()
    .maybeSingle();

  if (error) throw new Error(`Failed to create reel: ${error.message}`);
  logger.info('Reel created', { reelId: data.id, topic });
  return data;
}

async function getReelById(id) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('reels')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(`Failed to get reel: ${error.message}`);
  return data;
}

async function updateReel(id, updates) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('reels')
    .update(updates)
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) throw new Error(`Failed to update reel: ${error.message}`);
  return data;
}

async function listReelsByStatus(status) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('reels')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to list reels: ${error.message}`);
  return data || [];
}

async function listDrafts() {
  return listReelsByStatus('draft');
}

async function approveReel(id) {
  return updateReel(id, { status: 'approved' });
}

async function deleteReel(id) {
  return updateReel(id, { status: 'deleted' });
}

async function markReelAsProcessing(id) {
  return updateReel(id, { status: 'processing' });
}

async function markReelAsDraft(id, updates = {}) {
  return updateReel(id, { status: 'draft', ...updates });
}

async function markReelAsFailed(id, errorMessage) {
  return updateReel(id, { status: 'failed', error_message: errorMessage });
}

async function scheduleReel(reelId, scheduledAt, platform = 'telegram') {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('schedules')
    .insert({ reel_id: reelId, scheduled_at: scheduledAt, platform, status: 'pending' })
    .select()
    .maybeSingle();

  if (error) throw new Error(`Failed to schedule reel: ${error.message}`);
  await updateReel(reelId, { status: 'scheduled' });
  return data;
}

async function getPendingSchedules() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('schedules')
    .select('*, reels(*)')
    .eq('status', 'pending')
    .lte('scheduled_at', new Date().toISOString());

  if (error) throw new Error(`Failed to get pending schedules: ${error.message}`);
  return data || [];
}

async function markScheduleSent(scheduleId) {
  const supabase = getSupabase();
  await supabase
    .from('schedules')
    .update({ status: 'sent' })
    .eq('id', scheduleId);
}

module.exports = {
  createReel,
  getReelById,
  updateReel,
  listReelsByStatus,
  listDrafts,
  approveReel,
  deleteReel,
  markReelAsProcessing,
  markReelAsDraft,
  markReelAsFailed,
  scheduleReel,
  getPendingSchedules,
  markScheduleSent,
};
