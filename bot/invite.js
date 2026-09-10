function parseStartPayload(raw) {
  const args = typeof raw === 'string' ? raw.trim() : '';
  if (!args) return { kind: 'plain' };
  if (args.startsWith('share_')) {
    const token = args.slice('share_'.length).trim();
    return token ? { kind: 'share', token } : { kind: 'invalid' };
  }
  return { kind: 'plain' };
}

function buildShareWebAppUrl(webAppUrl, token) {
  const separator = webAppUrl.includes('?') ? '&' : '?';
  return `${webAppUrl}${separator}token=${encodeURIComponent(token)}`;
}

function buildInviteCopy(permissions, expiresAt) {
  const permissionsText = permissions === 'edit'
    ? 'редактирования'
    : 'просмотра';
  const expiryDate = new Date(expiresAt).toLocaleDateString('ru-RU');
  return (
    `🎉 *Доступ к истории полетов*\n\n` +
    `Владелец предоставил вам доступ для *${permissionsText}*\n\n` +
    `📅 Доступен до: ${expiryDate}\n\n` +
    `Нажмите кнопку ниже чтобы открыть приложение:`
  );
}

function buildOpenInviteCopy() {
  return (
    `🎉 *Приглашение в историю полетов*\n\n` +
    `Нажмите кнопку ниже, чтобы открыть приложение. ` +
    `Если ссылка недействительна, приложение само об этом скажет.`
  );
}

function webAppKeyboard(url, label) {
  return {
    inline_keyboard: [[{ text: label, web_app: { url } }]],
  };
}

function buildLookupInviteUrl(supabaseUrl) {
  return `${String(supabaseUrl).replace(/\/$/, '')}/rest/v1/rpc/lookup_share_invite`;
}

function isTelegramUnreachable(error) {
  const message = error && error.message ? String(error.message) : String(error || '');
  return /ETIMEDOUT|ECONNREFUSED|ENETUNREACH|EFATAL/i.test(message);
}

async function lookupShareInvite(token, options) {
  const supabaseUrl = options && options.supabaseUrl;
  const anonKey = options && options.anonKey;
  const fetchImpl = (options && options.fetchImpl) || fetch;

  if (!supabaseUrl || !anonKey) return { status: 'unknown' };

  try {
    const response = await fetchImpl(buildLookupInviteUrl(supabaseUrl), {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_token: token }),
    });

    if (!response.ok) return { status: 'unknown' };

    const data = await response.json();
    const row = Array.isArray(data) ? data[0] : data;
    if (!row || !row.permissions) return { status: 'invalid' };
    return {
      status: 'ok',
      permissions: row.permissions,
      expires_at: row.expires_at,
    };
  } catch {
    return { status: 'unknown' };
  }
}

module.exports = {
  parseStartPayload,
  buildShareWebAppUrl,
  buildInviteCopy,
  buildOpenInviteCopy,
  webAppKeyboard,
  buildLookupInviteUrl,
  isTelegramUnreachable,
  lookupShareInvite,
};
