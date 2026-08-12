// 10-toolbar.js
// Shows the REPLACE / AND / ERASE tools and the type toolbar.
// Handles bottom buttons, copy button, type buttons, and toolbar swipes.

const typePanelColors = {
  head: ["rgba(120,90,170,.20)", "rgba(120,90,170,.09)", "rgba(120,90,170,.16)"],
  html: ["rgba(180,135,20,.20)", "rgba(180,135,20,.09)", "rgba(180,135,20,.16)"],
  css: ["rgba(0,150,135,.20)", "rgba(0,150,135,.09)", "rgba(0,150,135,.16)"],
  js: ["rgba(190,120,0,.20)", "rgba(190,120,0,.09)", "rgba(190,120,0,.16)"],
  svg: ["rgba(90,60,150,.20)", "rgba(90,60,150,.09)", "rgba(90,60,150,.16)"],
  hidden: ["rgba(0,0,0,.09)", "rgba(0,0,0,.035)", "rgba(0,0,0,.10)"]
};

function setPanelColor(type){
  const c = typePanelColors[type] || ["rgba(142,103,58,.20)", "rgba(92,65,35,.10)", "rgba(105,73,38,.13)"];
  document.documentElement.style.setProperty("--type-bg-1", c[0]);
  document.documentElement.style.setProperty("--type-bg-2", c[1]);
  document.documentElement.style.setProperty("--type-border", c[2]);
}

function buildSelectedLineTools(){
  const old = document.querySelector(".selected-line-tools");
  if (old) old.remove();

  const tools = document.createElement("div");
  tools.className = "selected-line-tools";
  tools.innerHTML = `
    <button type="button" class="selected-replace-btn">REPLACE</button>
    <button type="button" class="selected-and-btn">AND</button>
    <button type="button" class="selected-erase-btn">ERASE</button>
  `;

  tools.querySelector(".selected-replace-btn").addEventListener("click", e => {
    e.stopPropagation();
    pasteIntoSelectedLines();
  });

  tools.querySelector(".selected-and-btn").addEventListener("click", e => {
    e.stopPropagation();
    addBetweenSelectedLines();
  });

  tools.querySelector(".selected-erase-btn").addEventListener("click", e => {
    e.stopPropagation();
    eraseSelectedLines();
  });

  document.body.appendChild(tools);
  updateSelectedLineTools();
}

function updateSelectedLineTools(){
  const tools = document.querySelector(".selected-line-tools");
  if (!tools) return;

  tools.classList.toggle("show-selected-tools", selectedLines.size > 0);

  const andBtn = tools.querySelector(".selected-and-btn");
  if (!andBtn) return;

  const selected = [...selectedLines].map(key => {
    const [block, line] = key.split(":").map(Number);
    return { block, line };
  });

  const canAnd =
    selected.length === 2 &&
    selected[0].block === selected[1].block &&
    Math.abs(selected[0].line - selected[1].line) === 1;

  andBtn.disabled = !canAnd;
  andBtn.classList.toggle("and-ready", canAnd);
}

function buildTypeToolbar(){
  const bar = document.createElement("div");
  bar.className = "type-toolbar";

  ["head", "html", "css", "js", "svg", "hidden"].forEach(type => {
    const button = document.createElement("button");
    button.className = `type-tool type-tool-${type}`;
    button.dataset.type = type;
    button.textContent = type === "hidden" ? "SRC" : type.toUpperCase();
    button.classList.toggle("active-tool", activeType === type);

    const count = currentParts.filter(part => part && part.type === type).length;

    if (!count){
      button.classList.add("type-tool-empty");
      button.disabled = true;
    }

    button.addEventListener("click", e => {
      e.stopPropagation();

      const indexes = currentParts
        .map((part, index) => part && part.type === type ? index : null)
        .filter(index => index !== null);

      if (!indexes.length) return;

      /*
        A type tap is a command:
        select that type, open its blocks, and center the first one.
      */
      expandedBlocks.clear();
      indexes.forEach(index => expandedBlocks.add(index));
      activeType = type;
      setPanelColor(type);

      renderBlockMode();
    });

    bar.appendChild(button);
  });

  codeView.appendChild(bar);
}

function buildCopyFinalButton(){
  const button = document.createElement("button");
  button.className = "copy-final-btn";
  button.textContent = "COPY ALL";

  button.addEventListener("pointerdown", e => e.stopPropagation());
  button.addEventListener("click", e => {
    e.stopPropagation();
    copyFinalBuild();
  });

  return button;
}

function buildBeforeAfterRows(beforeText, afterText){
  const beforeLines = String(beforeText).split("\n");
  const afterLines = String(afterText).split("\n");
  const count = Math.max(beforeLines.length, afterLines.length);
  let beforeHTML = "";
  let afterHTML = "";

  for (let i = 0; i < count; i++){
    const beforeLine = beforeLines[i] ?? "";
    const afterLine = afterLines[i] ?? "";
    const changed = beforeLine !== afterLine;
    const className = changed ? " compare-changed" : "";

    beforeHTML += `<span class="compare-line${className}">${escapeHTML(beforeLine) || " "}</span>\n`;
    afterHTML += `<span class="compare-line${className}">${escapeHTML(afterLine) || " "}</span>\n`;
  }

  return { beforeHTML, afterHTML };
}

function buildChangeReceiptHTML(beforeText, afterText){
  const history =
    window.ReplaceEraseHistory &&
    Array.isArray(window.ReplaceEraseHistory.undoStack)
      ? window.ReplaceEraseHistory.undoStack
      : [];

  const entries = history
    .map(action => String(action.label || "Changed"))
    .filter(Boolean);

  if (!entries.length && String(beforeText) !== String(afterText)){
    entries.push("Changed code");
  }

  if (!entries.length){
    return `
      <section class="change-receipt">
        <h2>CHANGED &amp; RENAMED</h2>
        <p class="receipt-empty">No changes yet.</p>
      </section>
    `;
  }

  return `
    <section class="change-receipt">
      <h2>CHANGED &amp; RENAMED</h2>
      <ol>
        ${entries.map((entry, index) =>
          `<li><span>${index + 1}</span>${escapeHTML(entry)}</li>`
        ).join("")}
      </ol>
    </section>
  `;
}

function rewindToOriginal(){
  if (!beforeCode) return;

  currentParts = splitCode(beforeCode);
  selectedLines = new Set();
  undoStack = [];

  if (window.ReplaceEraseHistory){
    window.ReplaceEraseHistory.undoStack.length = 0;
    window.ReplaceEraseHistory.redoStack.length = 0;
    window.ReplaceEraseHistory.update();
  }
  expandedBlocks = new Set(
    currentParts.map((part, index) => index)
  );
  activeType = "all";
  setPanelColor(null);

  renderBlockMode(true);
}

function buildPlaybackView(){
  const beforeLines = String(beforeCode).split("\n");
  const afterLines = String(getUnifiedCleanText()).split("\n");
  const count = Math.max(beforeLines.length, afterLines.length);

  codeView.innerHTML = `
    <div class="playback-view">
      <div class="playback-heading">
        <span>REWIND</span>
        <span class="playback-status">READY</span>
      </div>
      <pre class="playback-code"></pre>
      <div class="playback-controls">
        <button type="button" class="playback-play">PLAY</button>
        <button type="button" class="playback-restart">RESTART</button>
        <button type="button" class="playback-rewind">REWIND TO ORIGINAL</button>
        <button type="button" class="playback-back">BACK TO CODE</button>
      </div>
    </div>
  `;

  const pre = codeView.querySelector(".playback-code");
  const status = codeView.querySelector(".playback-status");
  const rows = [];

  for (let i = 0; i < count; i++){
    const row = document.createElement("span");
    const beforeLine = beforeLines[i] ?? "";
    const afterLine = afterLines[i] ?? "";

    row.className =
      "playback-line" +
      (beforeLine !== afterLine ? " playback-changed" : "");

    row.textContent = beforeLine || " ";
    row.dataset.before = beforeLine;
    row.dataset.after = afterLine;

    pre.appendChild(row);
    pre.appendChild(document.createTextNode("\n"));
    rows.push(row);
  }

  let timerIds = [];

  function clearPlaybackTimers(){
    timerIds.forEach(id => clearTimeout(id));
    timerIds = [];
  }

  function resetPlayback(){
    clearPlaybackTimers();
    rows.forEach(row => {
      row.textContent = row.dataset.before || " ";
      row.classList.remove("playback-changing", "playback-arrived");
    });
    status.textContent = "READY";
  }

  function playPlayback(){
    clearPlaybackTimers();
    resetPlayback();
    status.textContent = "PLAYING";

    const changedRows = rows.filter(row =>
      row.dataset.before !== row.dataset.after
    );

    changedRows.forEach((row, index) => {
      const start = setTimeout(() => {
        row.classList.add("playback-changing");

        const finish = setTimeout(() => {
          row.textContent = row.dataset.after || " ";
          row.classList.remove("playback-changing");
          row.classList.add("playback-arrived");

          if (index === changedRows.length - 1){
            status.textContent = "COMPLETE";
          }
        }, 360);

        timerIds.push(finish);
      }, index * 430);

      timerIds.push(start);
    });

    if (!changedRows.length){
      status.textContent = "NO CHANGES";
    }
  }

  codeView.querySelector(".playback-play")
    .addEventListener("click", playPlayback);

  codeView.querySelector(".playback-restart")
    .addEventListener("click", resetPlayback);

  codeView.querySelector(".playback-rewind")
    .addEventListener("click", e => {
      e.stopPropagation();
      rewindToOriginal();
    });

  codeView.querySelector(".playback-back")
    .addEventListener("click", e => {
      e.stopPropagation();
      enterUnifiedMode();
    });
}


function getSectionFileExtension(type){
  if (type === "html") return "html";
  if (type === "css") return "css";
  if (type === "js") return "js";
  return "txt";
}

function saveSeparatedSection(part, index){
  const type = part && part.type ? part.type : "section";
  const extension = getSectionFileExtension(type);
  const blob = new Blob([String(part && part.content || "")], {
    type: "text/plain;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `section-${index + 1}.${extension}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function openSeparatedSection(part, index){
  const type = part && part.type ? part.type : "section";
  const view = document.querySelector(".section-save-view");
  if (!view) return;

  view.innerHTML = `
    <div class="section-code-popup">
      <div class="section-code-heading">
        <span>${type.toUpperCase()} SECTION ${index + 1}</span>
        <button type="button" class="section-code-close">BACK</button>
      </div>
      <pre>${escapeHTML(String(part && part.content || ""))}</pre>
      <button type="button" class="section-save-one">SAVE THIS SECTION</button>
    </div>
  `;

  view.querySelector(".section-code-close")
    .addEventListener("click", e => {
      e.stopPropagation();
      buildSeparatedSectionsView();
    });

  view.querySelector(".section-save-one")
    .addEventListener("click", e => {
      e.stopPropagation();
      saveSeparatedSection(part, index);
    });

  const oldToolbar = codeView.querySelector(".type-toolbar");
  if (oldToolbar) oldToolbar.remove();

  buildTypeToolbar();
  enableToolbarSwipe();
}

function buildSeparatedSectionsView(){
  codeView.innerHTML = `
    <div class="section-save-view">
      <div class="section-save-heading">
        <span>SEPARATE SECTIONS</span>
        <span class="section-save-subtitle">Tap one to open and save it</span>
      </div>
      <div class="section-save-list"></div>
      <button type="button" class="section-save-back">BACK TO CODE</button>
    </div>
  `;

  const list = codeView.querySelector(".section-save-list");

  currentParts.forEach((part, index) => {
    if (!part) return;

    const type = part.type || "section";
    const card = document.createElement("button");
    card.type = "button";
    card.className = `section-save-card section-save-card-${type}`;
    card.innerHTML = `
      <span class="section-save-card-type">${type.toUpperCase()}</span>
      <span class="section-save-card-name">SECTION ${index + 1}</span>
      <span class="section-save-card-lines">${String(part.content || "").split("\\n").length} lines · TAP TO OPEN</span>
    `;

    card.addEventListener("click", e => {
      e.stopPropagation();
      openSeparatedSection(part, index);
    });

    list.appendChild(card);
  });

  codeView.querySelector(".section-save-back")
    .addEventListener("click", e => {
      e.stopPropagation();
      enterUnifiedMode();
    });

  buildTypeToolbar();
  enableToolbarSwipe();
}

function buildSeparatedSectionsButton(){
  const button = document.createElement("button");
  button.type = "button";
  button.className = "sections-save-button";
  button.textContent = "SECTIONS";

  button.addEventListener("click", e => {
    e.stopPropagation();
    buildSeparatedSectionsView();
  });

  return button;
}

function buildPlaybackButton(){
  const button = document.createElement("button");
  button.type = "button";
  button.className = "playback-button";
  button.textContent = "REWIND";

  button.addEventListener("click", e => {
    e.stopPropagation();
    buildPlaybackView();
  });

  return button;
}

function buildBeforeAfterView(){
  const afterText = getUnifiedCleanText();
  const rows = buildBeforeAfterRows(beforeCode, afterText);

  codeView.innerHTML = `
    <div class="before-after-view">
      <section class="before-after-column">
        <h2>BEFORE</h2>
        <pre>${rows.beforeHTML}</pre>
      </section>
      <section class="before-after-column">
        <h2>AFTER</h2>
        <pre>${rows.afterHTML}</pre>
      </section>
      ${buildChangeReceiptHTML(beforeCode, afterText)}
      <button type="button" class="before-after-back">BACK TO CODE</button>
    </div>
  `;

  codeView.querySelector(".before-after-back")
    .addEventListener("click", e => {
      e.stopPropagation();
      enterUnifiedMode();
    });
}

function buildBeforeAfterButton(){
  const button = document.createElement("button");
  button.type = "button";
  button.className = "before-after-button";
  button.textContent = "BEFORE & AFTER";

  button.addEventListener("click", e => {
    e.stopPropagation();
    buildBeforeAfterView();
  });

  return button;
}

function enterUnifiedMode(){
  closeOtherEditors();

  activeType = null;
  setPanelColor(null);
  document.body.classList.add("unified-mode");
  clearTextSelection();

  const clean = getUnifiedCleanText();

  codeView.innerHTML = `<pre>${escapeHTML(clean)}</pre>`;
  codeView.appendChild(buildCopyFinalButton());
  codeView.appendChild(buildBeforeAfterButton());
  codeView.appendChild(buildSeparatedSectionsButton());
  codeView.appendChild(buildPlaybackButton());
  buildTypeToolbar();
  enableToolbarSwipe();
}

function enableToolbarSwipe(){
  const bar = document.querySelector(".type-toolbar");
  if (!bar) return;

  let startX = 0;
  let dx = 0;
  let dragging = false;

  bar.addEventListener("pointerdown", e => {
    closeOtherEditors();
    startX = e.clientX;
    dx = 0;
    dragging = true;
    bar.setPointerCapture(e.pointerId);
  });

  bar.addEventListener("pointermove", e => {
    if (!dragging) return;
    dx = e.clientX - startX;
  });

  bar.addEventListener("pointerup", () => {
    if (!dragging) return;
    dragging = false;

    if (dx > 70) enterUnifiedMode();
    if (dx < -70) undoLastChange();
  });

  bar.addEventListener("pointercancel", () => {
    dragging = false;
  });
}
