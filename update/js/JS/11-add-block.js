// 11-add-block.js
// Lets gaps between blocks create new empty pieces.
// Swipe a gap and Replace & Erase adds a fresh block there.

function guessInsertType(index){
  if (activeType) return activeType;
  const before = currentParts[index - 1];
  if (before) return before.type;
  return "html";
}

function insertEmptyBlock(index){
  closeOtherEditors();
  saveUndoState();

  const type = guessInsertType(index);
  currentParts.splice(index, 0, { type, content:"" });

  expandedBlocks = new Set([...expandedBlocks].map(i => i >= index ? i + 1 : i));
  expandedBlocks.add(index);

  renderBlockMode();
  commitUndoState("Insert Block");

  requestAnimationFrame(() => {
    const block = codeView.querySelector(`.code-block[data-index="${index}"]`);
    if (block) convertBlockToTextarea(block, 0, 0);
  });
}

function enableInsertGapSwipe(){
  const gaps = [...codeView.querySelectorAll(".insert-gap")];

  gaps.forEach(gap => {
    let startX = 0;
    let startY = 0;
    let dx = 0;
    let dy = 0;
    let dragging = false;

    gap.addEventListener("pointerdown", e => {
      if (document.body.classList.contains("unified-mode")) return;

      startX = e.clientX;
      startY = e.clientY;
      dx = 0;
      dy = 0;
      dragging = true;
      gap.setPointerCapture(e.pointerId);
    });

    gap.addEventListener("pointermove", e => {
      if (!dragging) return;
      dx = e.clientX - startX;
      dy = e.clientY - startY;
    });

    gap.addEventListener("pointerup", () => {
      if (!dragging) return;
      dragging = false;

      const horizontalSwipe = Math.abs(dx) > 90;
      const mostlyHorizontal = Math.abs(dx) > Math.abs(dy) * 1.4;

      if (horizontalSwipe && mostlyHorizontal){
        insertEmptyBlock(Number(gap.dataset.insertIndex));
      }
    });

    gap.addEventListener("pointercancel", () => {
      dragging = false;
    });
  });
}
