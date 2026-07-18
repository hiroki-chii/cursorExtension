function registerShortcuts({
  globalShortcut,
  shortcuts,
  actions,
  onRegistrationError = console.error,
}) {
  globalShortcut.unregisterAll();

  for (const [name, accelerator] of Object.entries(shortcuts)) {
    const action = actions[name];
    if (!accelerator || !action) continue;

    try {
      globalShortcut.register(accelerator, action);
    } catch (error) {
      onRegistrationError(accelerator, error);
    }
  }
}

module.exports = { registerShortcuts };
