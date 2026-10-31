// Publishes the three.js renderer for src/ui.js, which reads window.CricketRenderer when it starts.
// This module is imported before ../ui.js from src/ui/index.js, so the hook exists by then. The plain build
// (src/ui.js inlined verbatim) never sees it and keeps the canvas renderer.
import { createRenderer } from './renderer.js';
if (typeof window !== 'undefined') window.CricketRenderer = { create: createRenderer };
