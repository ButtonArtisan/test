// 1-pasted-code.js
// The background memory of Replace & Erase.
// Holds the pasted code pieces and remembers what is selected, opened, active, or saved for undo.

const scene = document.getElementById("scene");
const stack = document.getElementById("stack");
const codeView = document.getElementById("codeView");
const status = document.getElementById("status");

document.addEventListener("gesturestart", e => e.preventDefault());
document.addEventListener("gesturechange", e => e.preventDefault());
document.addEventListener("gestureend", e => e.preventDefault());

let activeType = null;
let currentParts = [];
let beforeCode = "";
let colorOnlyMode = false;
let statusWasPressed = false;
let selectedLines = new Set();
let expandedBlocks = new Set();
let collapsedFunctions = new Set();
let undoStack = [];
