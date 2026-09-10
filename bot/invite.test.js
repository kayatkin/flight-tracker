const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  parseStartPayload,
  buildShareWebAppUrl,
  buildInviteCopy,
  buildOpenInviteCopy,
} = require('./invite');

describe('parseStartPayload', () => {
  it('treats empty /start as a plain open', () => {
    assert.deepEqual(parseStartPayload(''), { kind: 'plain' });
    assert.deepEqual(parseStartPayload('  '), { kind: 'plain' });
  });

  it('extracts a share token without logging it', () => {
    assert.deepEqual(parseStartPayload(' share_abc-token '), {
      kind: 'share',
      token: 'abc-token',
    });
  });

  it('rejects a share_ prefix without a token', () => {
    assert.deepEqual(parseStartPayload('share_'), { kind: 'invalid' });
  });
});

describe('invite copy', () => {
  it('does not embed the share token in Telegram text', () => {
    const text = buildInviteCopy('view', '2026-12-01T00:00:00.000Z');
    assert.equal(text.includes('Токен'), false);
    assert.equal(text.includes('abc-token'), false);
    assert.match(text, /просмотра/);
  });

  it('still sends users into the Mini App when the lookup is unknown', () => {
    assert.match(buildOpenInviteCopy(), /открыть приложение/);
  });

  it('appends the token only as a query param', () => {
    assert.equal(
      buildShareWebAppUrl('https://example.com/app', 'tok/en'),
      'https://example.com/app?token=tok%2Fen'
    );
  });
});
