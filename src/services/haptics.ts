/**
 * Light haptic feedback. Android browsers support the Vibration API. iOS
 * Safari does not, but since iOS 18 toggling a native `<input switch>` plays
 * a system haptic, so we flip a hidden one. Both are no-ops elsewhere.
 */
export type HapticKind = 'selection' | 'light' | 'success';

const PATTERNS: Record<HapticKind, number | number[]> = {
  selection: 6,
  light: 10,
  success: [12, 70, 18],
};

let iosSwitch: HTMLLabelElement | null = null;

function tickIosSwitch() {
  if (!iosSwitch) {
    iosSwitch = document.createElement('label');
    iosSwitch.setAttribute('aria-hidden', 'true');
    iosSwitch.style.display = 'none';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    input.tabIndex = -1;
    iosSwitch.append(input);
    document.body.append(iosSwitch);
  }
  iosSwitch.click();
}

export function haptic(kind: HapticKind): void {
  if (typeof navigator === 'undefined') return;
  try {
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(PATTERNS[kind]);
      return;
    }
    tickIosSwitch();
    if (kind === 'success') window.setTimeout(tickIosSwitch, 90);
  } catch {
    // Haptics are a nicety; never let them break an interaction.
  }
}
