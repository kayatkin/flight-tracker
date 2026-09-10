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

module.exports = {
  parseStartPayload,
  buildShareWebAppUrl,
  buildInviteCopy,
  buildOpenInviteCopy,
  webAppKeyboard,
};
