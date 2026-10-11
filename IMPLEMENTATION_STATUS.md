# CulletIQ rebuilt — implementation status

## Completed
- Preserved original Next.js pages, tests, model weights, Python G1/G2/G3/G4 inference, IndexedDB analysis, reports and citizen module.
- New landing page, navigation labels, and interactive two-stage sorting studio with SVG process scenes, guided simulation, working start/pause/reset/speed controls, upload/sample inference, annotated detections, conservative route explanation, records and AWS connection.
- Original industrial console retained at `/industrial/advanced` with simulation disclosure. Citizen false-success fallback, fabricated impact counters and automatic sample classification removed. Model metrics caveat added.
- AWS SAM API Gateway/Lambda/S3/DynamoDB evidence path added; writes require actual successful cloud response before marked synced.

## Verified here
- `npm run typecheck`: pass.
- `npm test`: 76 tests pass.
- `npm run test:aws`: AWS handler contract tests pass.
- `npm run build`: production build passes.
- `python3 -m py_compile server/main.py`: pass.

## Unverified / constraints
- Python model inference was not run: FastAPI, torch, OpenCV, timm and ultralytics are not installed in this workspace. Supplied weights and training metrics exist but have not been independently evaluated.
- Browser visual testing unavailable because cloud browser could not reach local server and blocks local file URLs.
- AWS deployment and responses unverified: no AWS credentials, CLI or SAM CLI in this workspace. API is publicly writable in pilot mode; add authentication for production.
- No physical equipment attached. Demo animation is simulated and model decisions remain advisory. Existing advanced lab still contains illustrative telemetry, labelled accordingly.

## Commands
- Frontend: `npm ci && npm run dev`.
- Model server: install `requirements.txt` in Python 3.11/3.12 venv, then `python -m uvicorn server.main:app --host 127.0.0.1 --port 8000`.
- AWS: `sam validate --template-file template.yaml`, `sam build`, `sam deploy --guided`.
