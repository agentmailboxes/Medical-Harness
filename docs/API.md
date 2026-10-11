# HTTP API

The app serves its API and frontend from the same origin. Run it locally, then open `/docs` for FastAPI's interactive schema. The examples below use `http://localhost:8080`.

## Health

`GET /api/health` returns a small status object and version. It does not call the external providers.

```bash
curl http://localhost:8080/api/health
```

## Chat request

Both chat endpoints accept JSON with `conversation` and an optional `conversation_id`:

```json
{
  "conversation": ["What does BMI mean?"],
  "conversation_id": "optional-stable-id"
}
```

`conversation` is a nonempty list of strings: user, assistant, user, and so on. It must end with the user's message. The server limits the conversation to 39 messages and each message to 8,000 characters by default. Reuse the returned `conversation_id` for follow-up requests.

`POST /api/chat` waits for a JSON response. For example:

```bash
curl -X POST http://localhost:8080/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"conversation":["What does BMI mean?"]}'
```

The response has `type` (`answer`, `follow_up`, `emergency`, or `conversation`), `conversation_id`, `answer`, `articles`, `tool_results`, `followups`, `anatomy_context`, and emergency or clarification fields. A `conversation` result handles greetings, thanks, help requests, unclear messages, and unrelated requests with a short reply in `answer`. It has no articles or calculator results and uses `evidence_status: "not_applicable"`. See `app/schemas.py` for exact optional fields and defaults.

## Streaming chat

`POST /api/chat/stream` accepts the same request and replies with `text/event-stream`:

```bash
curl -N -X POST http://localhost:8080/api/chat/stream \
  -H 'Content-Type: application/json' \
  -d '{"conversation":["What does BMI mean?"]}'
```

| Event | Meaning |
| --- | --- |
| `meta` | Generated or reused `conversation_id` |
| `step` | Current pipeline stage and human-readable message |
| `answer_chunk` | Reviewed answer text after the safety pass |
| `result` | Complete authoritative response; the UI renders this |
| `error` | Safe error detail when streaming work fails |

The server may send SSE comment keep-alives while work is pending. Consumers should ignore comments and use `result` as the final answer. The app currently emits the reviewed answer as one `answer_chunk`, after safety review.

## Metrics

`GET /api/metrics` is available only when `METRICS_TOKEN` is set. Send `Authorization: Bearer <token>`. Without a matching token, the route returns 404. It reports numeric usage, cache counters, and completed outcome counts (`conversation`, `follow_up`, `answer`, `emergency`, and `evidence_unavailable`), not question text. Counts are per process or Vercel Function instance.

## Limits and errors

Validation errors use normal FastAPI HTTP statuses. The app may return 429 for the per-instance chat rate limit or 503 when busy, timed out, or unable to complete a safe answer. Do not present a 503 as a medical answer. See [configuration](CONFIGURATION.md) for limit settings.

## Anatomy and calculators

`anatomy_context` is `null` unless triage determines a spatial explanation is useful. Otherwise it is a validated object such as:

```json
{"scene_id":"knee","label":"Knee","reason":"See the bones around the knee."}
```

Supported scene IDs are `head`, `neck`, `shoulder`, `chest`, `abdomen`, `pelvis`, `spine`, `elbow`, `hand`, `knee`, `lower_leg`, and `foot`. This replaces the old `has_anatomy`/region-array contract. Emergency, routine conversation and evidence failure paths suppress anatomy. The browser downloads the model only after the user opens it.

Calculator results include `tool`, `source`, `scope`, and a numeric score or value with units where applicable. Invalid supplied inputs yield an `error`; missing inputs never become assumed normal values. The approximate Framingham calculator has been removed. The new tools are adult CKD-EPI 2021 eGFR, estimated average glucose from HbA1c, and explicit measurement conversion.

The default aggregate conversation limit is 32,000 characters and request body limit is 262,144 bytes. A request above either limit returns 413. The `result` event is authoritative. Incomplete provider streams, failed re-review, or missing/out-of-range citation indices produce an error instead of an answer. An unsafe draft can be revised once and must pass a separate second review. Protected metrics include the LLM `circuit_open` flag.
