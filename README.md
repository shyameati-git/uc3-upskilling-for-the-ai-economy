# BuddyWork — AI Job Coach for Neurodivergent Workers

An AI-powered job coaching app that guides neurodivergent workers through workplace tasks step by step, using AR camera overlay, adaptive voice coaching, and sensory-aware design.

Built at the **AI Economy Workforce Upskilling Hackathon** — May 2026.

## What It Does

BuddyWork sits on a worker's phone and coaches them through any task:

- **See** — AR camera overlay reads shelf labels and highlights what's correct (green ✓) or misplaced (yellow ▲)
- **Hear** — Voice coach reads each instruction aloud at adjustable speed, hands-free
- **Do** — One action per screen, no ambiguity, just the next step

Designed specifically for autistic workers across three support levels, with sensory controls, customizable celebration, and break management built in.

## Demo

The app demo focuses on a **library shelf scanning task**: a worker scans a book shelf, the AI detects misplaced books, and the app guides them through fixing the order one book at a time.

## Project Structure

```
uc3-upskilling-for-the-ai-economy/
├── src/                        # React frontend
│   ├── App.jsx                 # Main app (final version)
│   ├── App_v1.jsx              # V1 — initial prototype
│   ├── App_v2.jsx              # V2 — autism-informed redesign
│   ├── App_v3.jsx              # V3 — voice + celebration
│   └── UnityScanner.jsx        # Unity WebGL wrapper component
├── unity/                      # Unity AR module
│   ├── Scripts/
│   │   └── ShelfScanner.cs     # Camera, OCR, AR overlay controller
│   └── Plugins/WebGL/
│       └── BuddyWorkBridge.jslib  # JS bridge for React ↔ Unity
├── azure/                      # Backend infrastructure
│   ├── deploy.sh               # One-script Azure setup
│   ├── function_app.py         # Python API (OCR, sorting, tasks, voice)
│   ├── requirements.txt        # Python dependencies
│   ├── host.json               # Azure Functions config
│   └── local.settings.example.json  # Local dev settings template
├── docs/                       # Presentation materials
│   ├── INTEGRATION_GUIDE.md    # Unity + React integration guide
│   ├── DEMO_SCRIPT.md          # 4-minute presentation script
│   └── BuddyWork_Pitch_Deck.pptx  # 10-slide pitch deck
└── public/
    └── index.html              # Entry point
```

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React | Task flow, voice coach, celebration, settings |
| AR Module | Unity WebGL | Camera feed, OCR overlay, book highlighting |
| Backend | Azure Functions (Python) | Sorting engine, task API, voice script generation |
| Vision | Azure AI Vision | OCR to read spine labels from shelf photos |
| AI Coach | Azure AI Foundry (GPT-5.4 mini) | Adaptive voice scripts calibrated to support level |
| Database | Cosmos DB (Serverless) | Worker profiles, task logs, progress streaks |
| Storage | Azure Blob Storage | Shelf photos, task instruction images |
| Hosting | Azure Static Web Apps | Frontend + Unity WebGL build |

## Key Design Principles

Built from autism UX research, not retrofitted accessibility:

1. **One action per screen** — never wonder what to do next
2. **Pictograms over paragraphs** — visual signals, not walls of text
3. **Shape + color, never color alone** — circle = correct, triangle = wrong
4. **Factual language** — "Shelf is correct" not "Great job!"
5. **Sensory controls** — reduced motion toggle, calm/stars/party celebration
6. **Three support levels** — same app adapts from independent to fully guided

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ocr` | POST | Send shelf photo, get detected call numbers |
| `/api/sort` | POST | Check if call numbers are in correct order |
| `/api/tasks` | GET | Get today's task list for a worker |
| `/api/complete` | POST | Log task completion, update streaks |
| `/api/voice-script` | POST | Generate adaptive voice coaching text |
| `/api/worker` | GET/POST | Worker profile and preferences |

## Quick Start

### Frontend (React)
```bash
npm install
npm start
```

The frontend reads the backend base URL from `REACT_APP_API_BASE_URL`.

- Local development default: `http://localhost:7071`
- Azure example: `https://buddywork-api.azurewebsites.net`

Copy `.env.local.example` to `.env.local` in the repo root for local overrides:

```bash
cp .env.local.example .env.local

REACT_APP_API_BASE_URL=http://localhost:7071
```

### Backend (Azure Functions)
```bash
cd azure
test -f local.settings.json || cp local.settings.example.json local.settings.json
pip install -r requirements.txt
func start
```

Required Azure Function app settings for chat and voice generation:

- `FOUNDRY_KEY`
- `FOUNDRY_ENDPOINT`
- `FOUNDRY_DEPLOYMENT`

Optional compatibility setting:

- `FOUNDRY_MODEL` (defaults to the deployment name when using `azure/deploy.sh`)

### CI/CD Pipelines

This repo now deploys through GitHub Actions:

- `CI` runs on every push and pull request to build the React frontend and validate/package the Azure Functions backend.
- `CD` runs on pushes to `develop` and `main`.
- `CD` first runs `azure/deploy.sh` to create or update Azure infrastructure, then deploys the backend and frontend apps.

Required GitHub Actions repository secrets (already created):

- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`

Optional GitHub Actions repository variables:

- `AZURE_FUNCTIONAPP_NAME` (defaults to `buddywork-api`)
- `AZURE_STATIC_WEB_APP_NAME` (defaults to `buddywork`)
- `AZURE_RESOURCE_GROUP` (defaults to `UseCase3`)

The CD workflow uses Azure OIDC via `azure/login@v2`, so it does not require a Function App publish profile or a stored Static Web Apps deployment token.

### Deploy to Azure Manually

Use this flow when you want to provision or update resources outside GitHub Actions.

```bash
# Set up all Azure resources
chmod +x azure/deploy.sh
./azure/deploy.sh

# Deploy backend
cd azure
test -f local.settings.json || cp local.settings.example.json local.settings.json
func azure functionapp publish buddywork-api
cd ..

# Deploy frontend
REACT_APP_API_BASE_URL=https://buddywork-api.azurewebsites.net npm run build
swa deploy ./build --app-name buddywork
```

If you build the frontend in CI/CD, set `REACT_APP_API_BASE_URL` in the build environment so the deployed app calls the hosted Azure Functions backend.

Notes:

- `azure/deploy.sh` is idempotent and can be rerun to reconcile the Azure resources used by the app.
- In Git Bash, commands that pass Azure resource IDs or slash-prefixed values may require `MSYS_NO_PATHCONV=1` to avoid path rewriting.
- The automated CD workflow is the preferred deployment path for `develop` and `main`.

### Tear Down Azure Resources

Run the cleanup script to remove all resources created by `deploy.sh`:

```bash
chmod +x azure/undeploy.sh
./azure/undeploy.sh
```

The script deletes each BuddyWork resource individually and purges soft-deleted Cognitive Services (Vision, Foundry AI Services) so their names can be reused. The shared `UseCase3` resource group is preserved.

## Team

| Name | Role |
|------|------|
| Cynthia | PM / Organizer |
| Mukti | UI Developer (React) |
| Anthony | Unity Developer (AR) |
| Gauransh | Backend (Python, APIs) |
| Shyameati | AI/Vision Pipeline |
| Jorge Balderas | Azure Infrastructure |
| Daniel | Cloud Services SME |
| Jimintamin | Data / Access Management |
| Aysu | Designer / Storyteller |
| Lori | Domain Expert / Storyteller |
| Vikas Singh | Strategy / Architecture |

## License

MIT
