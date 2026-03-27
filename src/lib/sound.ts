let notificationAudio: HTMLAudioElement | null = null;
let unlockListenersBound = false;
let soundUnlocked = false;

function getNotificationAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;

  if (!notificationAudio) {
    notificationAudio = new Audio("/sounds/notification.mp3");
    notificationAudio.preload = "auto";
  }

  return notificationAudio;
}

function cleanupUnlockListeners() {
  if (typeof window === "undefined") return;
  if (!unlockListenersBound) return;

  window.removeEventListener("pointerdown", unlockNotificationSound);
  window.removeEventListener("keydown", unlockNotificationSound);
  window.removeEventListener("touchstart", unlockNotificationSound);

  unlockListenersBound = false;
}

async function unlockNotificationSound() {
  const audio = getNotificationAudio();
  if (!audio || soundUnlocked) {
    cleanupUnlockListeners();
    return;
  }

  try {
    audio.muted = true;
    audio.currentTime = 0;

    const playResult = audio.play();

    if (playResult && typeof playResult.then === "function") {
      await playResult;
    }

    audio.pause();
    audio.currentTime = 0;
    audio.muted = false;

    soundUnlocked = true;
    cleanupUnlockListeners();
  } catch {
    audio.muted = false;
  }
}

export function initNotificationSound() {
  const audio = getNotificationAudio();
  if (!audio || typeof window === "undefined") return;

  audio.load();

  if (unlockListenersBound || soundUnlocked) return;

  unlockListenersBound = true;

  window.addEventListener("pointerdown", unlockNotificationSound, {
    passive: true,
  });
  window.addEventListener("keydown", unlockNotificationSound);
  window.addEventListener("touchstart", unlockNotificationSound, {
    passive: true,
  });
}

export async function playNotificationSound() {
  const audio = getNotificationAudio();
  if (!audio) return;

  try {
    audio.pause();
    audio.currentTime = 0;

    const playback = audio.cloneNode(true) as HTMLAudioElement;
    playback.currentTime = 0;

    const playResult = playback.play();
    if (playResult && typeof playResult.then === "function") {
      await playResult;
    }
  } catch {
    try {
      audio.currentTime = 0;
      const fallbackPlayResult = audio.play();

      if (
        fallbackPlayResult &&
        typeof fallbackPlayResult.then === "function"
      ) {
        await fallbackPlayResult;
      }
    } catch {
      // ignore
    }
  }
}
