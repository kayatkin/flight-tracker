const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  parseStartPayload,
  buildShareWebAppUrl,
  buildInviteCopy,
  buildOpenInviteCopy,
  buildLookupInviteUrl,
  isTelegramUnreachable,
  lookupShareInvite,
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

describe('lookupShareInvite', () => {
  it('builds the RPC URL without a trailing slash', () => {
    assert.equal(
      buildLookupInviteUrl('https://example.supabase.co/'),
      'https://example.supabase.co/rest/v1/rpc/lookup_share_invite'
    );
  });

  it('returns unknown when anon key is missing', async () => {
    const result = await lookupShareInvite('tok', { supabaseUrl: 'https://example.supabase.co' });
    assert.deepEqual(result, { status: 'unknown' });
  });

  it('returns ok for an active invite row', async () => {
    const fetchImpl = async (url, init) => {
      assert.equal(url, 'https://example.supabase.co/rest/v1/rpc/lookup_share_invite');
      assert.equal(init.method, 'POST');
      assert.equal(JSON.parse(init.body).p_token, 'tok');
      return {
        ok: true,
        json: async () => [{ permissions: 'view', expires_at: '2026-12-01T00:00:00.000Z' }],
      };
    };

    const result = await lookupShareInvite('tok', {
      supabaseUrl: 'https://example.supabase.co',
      anonKey: 'anon',
      fetchImpl,
    });
    assert.equal(result.status, 'ok');
    assert.equal(result.permissions, 'view');
  });

  it('treats an empty RPC result as invalid', async () => {
    const result = await lookupShareInvite('tok', {
      supabaseUrl: 'https://example.supabase.co',
      anonKey: 'anon',
      fetchImpl: async () => ({ ok: true, json: async () => [] }),
    });
    assert.deepEqual(result, { status: 'invalid' });
  });
});

describe('isTelegramUnreachable', () => {
  it('detects blocked-network timeouts', () => {
    assert.equal(isTelegramUnreachable({ message: 'EFATAL: Error: ETIMEDOUT' }), true);
    assert.equal(isTelegramUnreachable({ message: 'socket hang up' }), false);
  });
});
