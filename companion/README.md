# AURA AI — Desktop Companion Daemon

The **AURA Desktop Companion** provides authorized, permission-gated local computer control for the AURA AI system.

## Capabilities

| Capability | Permission Level | Description |
|---|---|---|
| `FILES_READ` | `ALLOW` | Read local files within allowed workspace |
| `FILES_WRITE` | `ALLOW` | Write and scaffold project assets |
| `FILES_DELETE` | `ASK` | Delete files with interactive human approval |
| `TERMINAL_EXECUTION` | `ASK` | Run shell commands with human confirmation |
| `BROWSER_CONTROL` | `ALLOW` | Headless/Headed Chromium navigation & interaction |
| `APP_LAUNCH` | `ASK` | Launch authorized desktop applications |
| `SCREEN_CAPTURE` | `ALLOW` | Capture real screen displays and verify UI |
| `SCREEN_ANALYSIS` | `ALLOW` | Spatial layout and element detection |
| `CLIPBOARD_READ` | `ASK` | Read user clipboard buffer with approval |
| `CLIPBOARD_WRITE` | `ALLOW` | Paste code and tokens into clipboard |
| `GIT_ACCESS` | `ALLOW` | Stage commits, check branch status, and inspect diffs |

## Installation & Setup

1. **Install Python dependencies**:
   ```bash
   cd companion
   pip install -r requirements.txt
   playwright install chromium
   ```

2. **Run the Companion Daemon**:
   ```bash
   python aura_companion.py --host 0.0.0.0 --port 5005 --server-url http://localhost:3000 --token YOUR_SECRET_TOKEN
   ```

3. **Options**:
   - `--host`: Listen host (default: `127.0.0.1`)
   - `--port`: Listen port (default: `5005`)
   - `--server-url`: Central AURA server endpoint for heartbeat registration
   - `--token`: Shared token for signed HMAC request verification
   - `--workspace`: Root directory for file operations (default: current working directory)

## Architecture & Security

- **Zero Unsolicited Execution**: Dangerous commands (terminal commands, file deletions, app launches) require interactive user authorization (`ASK`).
- **Heartbeat & Liveness**: The companion pings the central AURA server every 5 seconds. If the companion disconnects, AURA flags computer control as `OFFLINE` and prevents remote invocation.
- **Evidence Verification**: Every tool invocation records an audit log entry with execution duration, exit code, and output SHA256.
