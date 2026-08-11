// Preferences page: load and save the badge size choice.

/**
 * Reflect the given size on the Small / Large radios.
 * @param {"small"|"large"} size
 */
function setSelectedSize(size) {
  const radios = document.querySelectorAll('input[name="badgeSize"]');
  for (const radio of radios) {
    radio.checked = radio.value === size;
  }
}

/**
 * Persist the selected radio and keep the UI in sync with the saved value.
 * @param {Event} event
 */
async function onSizeChange(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement) || target.name !== "badgeSize") {
    return;
  }
  const saved = await BadgeSize.save(target.value);
  setSelectedSize(saved);
}

/**
 * Load the retained preference, select the matching radio, and wire change handlers.
 */
async function initPreferences() {
  const size = await BadgeSize.load();
  setSelectedSize(size);

  const radios = document.querySelectorAll('input[name="badgeSize"]');
  for (const radio of radios) {
    radio.addEventListener("change", onSizeChange);
  }
}

initPreferences();
