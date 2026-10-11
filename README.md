# CulletIQ — rebuilt sorting studio

This upgrade preserves the supplied Next.js application, its G1/G3/G4 model weights, FastAPI inference routes, detailed colour analysis, citizen guidance, sample history, comparison, reports, and model hub. It adds a clearer home page and a visual sorting studio with distinct **whole-item conveyor** and **post-crush free-fall chute** stages. The older dense console remains under `/industrial/advanced`, explicitly marked as a simulation lab.

## Start locally on Windows 11

Install Node.js 20+ and Python 3.11 or 3.12. From this directory in Command Prompt:

```bat
npm ci
npm run dev
```

Open `http://localhost:3000`. For **real G1/G2, G3, and G4 inference**, start the Python service in a second Command Prompt:

```bat
py -3.11 -m venv .venv
.venv\Scripts\activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m uvicorn server.main:app --host 127.0.0.1 --port 8000
```

The Python packages include PyTorch and Ultralytics and can take time to download. CPU inference is supported but slower. For RTX acceleration, install an appropriate CUDA-enabled PyTorch build from the official PyTorch selector in the activated venv before installing the remaining dependencies. Verify `http://127.0.0.1:8000/api/v1/health`, then use **Sorting studio → Inspect an image**. The Next.js rewrite in `next.config.ts` proxies `/api/v1/*` to the local Python service; deploying the Next.js frontend alone will not deploy the model server.

## What is real, simulated, and measured

- **Model input:** Upload a JPG, PNG, or WebP (≤10 MB) or select a labelled sample. The frontend sends it to FastAPI. A successful response includes detections, model scores, route evidence, and an annotated image. The new studio sends weak/no detections and possible contaminants to review. It records successful calls locally; demo items do not enter those counts.
- **Guided demo:** The belt, camera zone, diverter, falling chute, and bins animate in a scripted sequence, marked `DEMO · SIMULATED`. Start, pause/resume, reset, speed and stage controls change the scene state. No physical camera, solenoid, diverter, or scale is connected.
- **Batch analysis:** `/analyse`, `/samples`, `/compare`, `/insights`, and print reports use the existing deterministic browser image-analysis pipeline and IndexedDB history. This is separate from G1/G3 model-call history shown in the studio.
- **Citizen guidance:** G4 requires the local FastAPI service. A model error now produces an error and no classification. Its old invented impact counters and clear-glass fallback were removed.
- **Model hub:** Supplied training logs and metrics have not been independently reproduced. The G3 stats file reports mAP50 = 0.302. Do not present training metrics as field accuracy.

**Critical limitation:** RGB cannot confirm chemical composition or distinguish all visually similar glass, crystal, ceramic, or stone. Segmented pixel area is not mass, certified stream purity, or verified environmental savings. All routes are decision support for an operator.

## AWS evidence integration

This project contains a real AWS write path, but **the stack is not deployed in this workspace**. When configured, the studio sends a resized JPEG and the actual model decision to API Gateway → Lambda → private S3 and DynamoDB. The interface says `AWS saved` only after a successful response. The Lambda stores image evidence for 30 days and decision metadata with a 30-day DynamoDB TTL; IAM permits only S3 PutObject in the inspection prefix and DynamoDB PutItem/UpdateItem on the table. API Gateway rate limit is 2 requests/second, burst 5; Lambda concurrency is capped at 2. The public pilot endpoint has no user authentication, so restrict access and add authentication before handling private third-party photos in production.

Install/configure AWS CLI and AWS SAM CLI, set a small AWS Budget alert, then from the project root:

```bat
sam validate --template-file template.yaml
sam build --template-file template.yaml
sam deploy --guided
```

Use the returned `ApiUrl` in **Sorting studio → AWS connection**, save it, then make a new model-backed inspection. Verify its item in DynamoDB and its object in S3. Do not show credentials in the demo. AWS account and credentials were unavailable here, so no cloud response or deployment is claimed. The model server remains local unless separately hosted on suitable infrastructure; this AWS template stores evidence and does not host the PyTorch models.

## Validation

```bat
npm run typecheck
npm test
npm run test:aws
npm run build
python -m py_compile server/main.py
```

In this workspace, TypeScript, 76 existing tests, AWS handler contract tests, Python syntax, and production Next.js build passed. Full Python model inference, browser visual interaction, SAM validation, and live AWS persistence remain unverified here because model dependencies, a reachable local browser, SAM CLI, and AWS credentials were unavailable.

## Three-minute demo sequence

1. **0:00–0:20:** From the home page, explain the two physical stages and why contaminants matter.
2. **0:20–0:55:** Open Sorting studio. Start the clearly labelled guided demo, pause at the camera, adjust speed, show reject/review, then switch to the free-fall chute and bins.
3. **0:55–1:45:** With the FastAPI service running, select a whole-item sample or upload a real photo. Show model-online state, annotated detections, route reason and an uncalibrated score. Switch stages and inspect a cullet photo.
4. **1:45–2:15:** Open `/analyse` and a saved sample report, then citizen guidance or model hub. State that the colour-analysis records and model-call records are separate.
5. **2:15–2:45:** If AWS is deployed, inspect a new image, show `AWS saved`, and show the corresponding DynamoDB item and private S3 object.
6. **2:45–3:00:** State the RGB limitation and human-review safeguard.

## Submission write-up draft

**Problem:** Whole unsuitable objects and contaminated or mixed fragments reduce the value of recycled container glass. Operators need visible, explainable first-pass screening at the appropriate point in the physical process.

**Build:** CulletIQ uses separate upstream whole-item detection and downstream fragment segmentation. The rebuilt sorting studio makes movement and route decisions understandable, connects uploaded images to the supplied models, records successful inspections, and directs uncertain cases to a person. The guided motion is labelled as simulation. Detailed browser colour analysis and citizen guidance remain available.

**AWS:** Once deployed, API Gateway, Lambda, private S3, and DynamoDB store model-backed inspection evidence and decisions. Show a successful write in the video. If it is not deployed, say so rather than implying AWS usage was demonstrated.

**Tools and attribution:** ChatGPT Codex contributed to this upgrade. The supplied ZIP contained the model code and weights; verify their original training date, dataset provenance, reuse rights, and licences before publication. `public/demo/real/ATTRIBUTION.md` credits Alter Fritz’s CC BY-SA 3.0 photographs. The supplied archive has October 11 timestamps but no Git history; do not claim eligibility without truthful verification of when qualifying project work began. The official hackathon rules exclude projects begun before October 8 even if rewritten.

`REFERENCE_README.md` preserves the original prototype documentation for comparison. `IMPLEMENTATION_STATUS.md` records current verification and limitations.
