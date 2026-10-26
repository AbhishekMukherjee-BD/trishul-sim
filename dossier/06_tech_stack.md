# ═══════════════════════════════════════════════════════════════════════════════
# TRISHUL-SIM: RESOLVED TECH STACK & RATIONALE (06_tech_stack.md)
# ═══════════════════════════════════════════════════════════════════════════════

## 1. RESOLVED DEPENDENCY & TECHNOLOGY MATRIX

*(Resolved exact versions extracted directly from `package-lock.json` and system runtime environment)*

| Technology / Library | Resolved Version | Primary Role & Purpose | File Paths / Where Used |
|---|---|---|---|
| **Node.js** | `v22.11.0` | JavaScript runtime environment for tooling and testing | `package.json`, `test-audit.js` |
| **Python** | `3.14.7` | Standard library runtime for MAVLink bridge & evaluation | `server/app.py` |
| **React** | `19.3.0` | UI component library, reactive state management, lifecycle hooks | `src/App.jsx`, `src/components/*.jsx` |
| **ReactDOM** | `19.3.0` | Document Object Model renderer for React 19 tree | `src/main.jsx:L2` |
| **Three.js** | `0.174.0` | 3D WebGL rendering engine (cameras, scenes, mesh pooling, math) | `src/components/RadarViewport.jsx`, `src/simulation/*.js` |
| **Vite** | `6.4.4` | Ultra-fast ES-module dev server and production bundler | `vite.config.js:L1-L16`, `package.json:L8-L10` |
| **TailwindCSS** | `4.3.3` | Utility-first CSS styling framework (v4 engine) | `src/index.css`, `vite.config.js:L3` |
| **@tailwindcss/vite** | `4.3.3` | Official Vite plugin for Tailwind CSS v4 compilation | `vite.config.js:L3` |
| **@vitejs/plugin-react**| `4.3.4` | Vite plugin providing React Fast Refresh and JSX transformation | `vite.config.js:L2` |
| **Lucide React** | `1.54.0` | Tactical military iconography (radar, shields, crosshairs, radios) | `src/components/*.jsx`, `src/App.jsx` |
| **GLSL (OpenGL ES)** | ES 3.0 / WebGL2 | Custom vertex & fragment shaders for thermal infrared imaging | `src/shaders/thermalShader.js:L1-L89` |
| **Ollama** | `0.15.5` | Local LLM inference engine running on macOS metal acceleration | `src/components/AARDebriefModal.jsx:L89`, `server/app.py:L130` |
| **Mistral 7.2B** | `latest` (`Q4_K_M`) | Sovereign LLM Directing Staff After-Action Review generator | `src/components/AARDebriefModal.jsx:L92`, `server/app.py:L132` |

---

## 2. ARCHITECTURAL DECISION RATIONALE

- **Three.js vs. Canvas 2D for Radar** (`0.174.0`):
  - [INFERRED] Three.js enables true 3D spatial vector mathematics (`THREE.Vector3`), volumetric defense boundary spheres, and dynamic camera rotations (orbit controls, tactical zoom) that cannot be modeled in flat 2D canvas displays.
  - [VERIFIED-READ] Implemented **mesh object pooling** (`RadarViewport.jsx:L45-L65`) to instantiate drone meshes and trails once, completely eradicating garbage collection pauses during critical combat drills.
- **Tailwind CSS v4 & System Fallback Fonts**:
  - [VERIFIED-READ] Built without Google Fonts CDN dependencies (`index.html:L8`), satisfying military NFR-2 air-gapped guidelines while retaining responsive luxury dark-mode ergonomics (`#06080c` obsidian with `#d4af37` gold).
- **Zero-Dependency Python Standard Library Backend**:
  - [VERIFIED-READ] `server/app.py` runs exclusively on Python's built-in `http.server`, `socketserver`, and `urllib.request`. Zero `pip install` commands or external virtual environment dependencies are required, making deployment on military workstations instantaneous.
- **Local Ollama Mistral vs. OpenAI / Cloud APIs**:
  - [INFERRED] Telemetry from defence installations (Ladakh FOB coordinates, firing accuracy, ammunition levels) can never be transmitted across commercial cloud infrastructure. Running `mistral:latest` locally on port 11434 maintains 100% data sovereignty.
