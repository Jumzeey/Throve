-- Media provider metadata for LiveKit / Amazon IVS swap.
alter table public.live_sessions
  add column if not exists media_provider text not null default 'livekit',
  add column if not exists ivs_channel_arn text,
  add column if not exists ivs_ingest_endpoint text,
  add column if not exists ivs_playback_url text,
  add column if not exists ivs_stream_key text;

comment on column public.live_sessions.media_provider is 'livekit | ivs | simulated';
comment on column public.live_sessions.ivs_stream_key is 'Host-only IVS stream key; never expose to viewers';
