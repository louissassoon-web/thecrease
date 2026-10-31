// Module entry for the bundled UI (node tools/build.mjs --bundle --minify).
// three/register.js publishes the three.js renderer on window.CricketRenderer before ui.js runs; ui.js
// selects it only when the page is opened with ?renderer=three or the cricket.renderer storage key is 'three'.
import './three/register.js';
import '../ui.js';
