(function () {
  "use strict";

  /*
    Replace-Erase Redo button.

    Load this file after undoredo/undo.js.
    The shared history is available as window.ReplaceEraseHistory.
  */

  var history = window.ReplaceEraseHistory =
    window.ReplaceEraseHistory || {
      undoStack: [],
      redoStack: [],
      listeners: [],

      record: function (action) {
        if (!action || typeof action.undo !== "function" ||
            typeof action.redo !== "function") {
          return;
        }

        this.undoStack.push(action);
        this.redoStack.length = 0;
        this.update();
      },

      undo: function () {
        var action = this.undoStack.pop();

        if (!action) {
          return;
        }

        action.undo();
        this.redoStack.push(action);
        this.update();
      },

      redo: function () {
        var action = this.redoStack.pop();

        if (!action) {
          return;
        }

        action.redo();
        this.undoStack.push(action);
        this.update();
      },

      canUndo: function () {
        return this.undoStack.length > 0;
      },

      canRedo: function () {
        return this.redoStack.length > 0;
      },

      update: function () {
        this.listeners.forEach(function (listener) {
          listener();
        });
      },

      onUpdate: function (listener) {
        this.listeners.push(listener);
      }
    };

  function createRedoButton() {
    if (document.getElementById("replace-erase-redo-button")) {
      return;
    }

    var button = document.createElement("button");

    button.id = "replace-erase-redo-button";
    button.type = "button";
    button.textContent = "Redo";
    button.setAttribute("aria-label", "Redo last undone action");

    button.style.cssText = [
      "position: fixed",
      "right: 24px",
      "bottom: 18px",
      "z-index: 999999",
      "min-width: 78px",
      "min-height: 42px",
      "padding: 8px 14px",
      "border: 2px solid #fff",
      "border-radius: 6px",
      "color: #111",
      "background: #deded7",
      "font: 900 12px Arial, sans-serif",
      "text-transform: uppercase",
      "cursor: pointer",
      "box-shadow: 0 4px 0 rgba(0, 0, 0, .55)"
    ].join(";");

    button.addEventListener("click", function () {
      window.ReplaceEraseHistory.redo();
    });

    document.body.appendChild(button);

    window.ReplaceEraseHistory.onUpdate(function () {
      button.disabled = !window.ReplaceEraseHistory.canRedo();
      button.style.opacity = button.disabled ? "0.42" : "1";
    });

    window.ReplaceEraseHistory.update();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createRedoButton);
  } else {
    createRedoButton();
  }
}());
