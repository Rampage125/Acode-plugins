const pluginId = "com.custom.run-selection";

if (window.acode) {
  acode.setPluginInit(pluginId, (baseUrl, $page, cache) => {

    function runSelection() {
      const editor = editorManager.editor;
      const selected = editor.getSelectedText();

      if (!selected || selected.trim() === "") {
        window.toast("Сначала выдели код!", 3000);
        return;
      }

      const activeFile = editorManager.activeFile;
      const filename = (activeFile && activeFile.name) ? activeFile.name : "selection.py";

      const session = editor.session;
      const selectionRange = editor.getSelectionRange();
      const startRow = selectionRange.start.row;
      const allLines = session.getDocument().getAllLines();
      const linesBefore = allLines.slice(0, startRow);
      const contextCode = linesBefore.join("\n");
      const selectedCode = selected;

      const fullCode = `import sys as _sys, io as _io
_old_stdout = _sys.stdout
_sys.stdout = _io.StringIO()
try:
${contextCode.split("\n").map(l => "    " + l).join("\n")}
except:
    pass
_sys.stdout = _old_stdout
${selectedCode}`;

      const b64 = btoa(unescape(encodeURIComponent(fullCode)));
      const command = `echo '${b64}' | RUN_FILE='${filename}' ~/run_sel`;

      const acodeX = acode.require("acodex");
      if (acodeX && typeof acodeX.execute === "function") {
        if (acodeX.isMinimized && acodeX.isMinimized()) {
          acodeX.maximiseTerminal();
        } else if (acodeX.isTerminalOpened && !acodeX.isTerminalOpened()) {
          acodeX.openTerminal();
        }
        acodeX.execute(command);
      } else {
        navigator.clipboard.writeText(command).then(() => {
          window.toast("Скопировано — вставь в терминал", 3000);
        });
      }
    }

    editorManager.editor.commands.addCommand({
      name: "run-selection:run",
      exec: runSelection,
    });

    const Palette = acode.require("palette");
    if (Palette) Palette("run-selection:run", "Run Selection: запустить выделенный код", runSelection);

    const SelectionMenu = acode.require("selectionMenu");
    if (SelectionMenu) SelectionMenu.add(runSelection, "▶", "all");

    window.toast("Run Selection готов!", 2000);
  });

  acode.setPluginUnmount(pluginId, () => {
    try { editorManager.editor.commands.removeCommand("run-selection:run"); } catch(e) {}
  });
}
