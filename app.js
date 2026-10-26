const STORAGE_KEY = "voz-nota-transcriptions";
const transcriptInput = document.querySelector("#transcript");
const languageSelect = document.querySelector("#language-select");
const recordButton = document.querySelector("#record-button");
const recordButtonLabel = document.querySelector("#record-button-label");
const saveButton = document.querySelector("#save-button");
const clearButton = document.querySelector("#clear-button");
const clearAllButton = document.querySelector("#clear-all-button");
const savedList = document.querySelector("#saved-list");
const savedCount = document.querySelector("#saved-count");
const status = document.querySelector("#status");
const statusText = document.querySelector("#status-text");
const liveIndicator = document.querySelector("#live-indicator");
const installButton = document.querySelector("#install-button");

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;
let NativeSpeechRecognition = null;
let useNativeSpeech = false;
let recognition = null;
let nativePartialListener = null;
let nativeStateListener = null;
let isRecording = false;
let transcriptBeforeRecording = "";
let finalSpeech = "";
let deferredInstallPrompt = null;

function setupAppInstallation() {
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
  const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);

  if (!isStandalone && isIos) {
    installButton.hidden = false;
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    installButton.hidden = false;
  });

  installButton.addEventListener("click", async () => {
    if (!deferredInstallPrompt) {
      if (isIos) {
        window.alert(
          "Para instalar Voz Nota en tu iPhone o iPad:\n\n1. Pulsa Compartir en Safari.\n2. Elige «Añadir a pantalla de inicio».",
        );
      }
      return;
    }

    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    installButton.hidden = true;
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    installButton.hidden = true;
    showStatus("Voz Nota se instaló correctamente.");
  });

  if ("serviceWorker" in navigator && window.isSecureContext) {
    navigator.serviceWorker.register("./service-worker.js").catch((error) => {
      console.error("No se pudo activar el modo sin conexión.", error);
    });
  }
}

async function setupNativeSpeech() {
  if (!window.Capacitor) return;

  try {
    const [{ Capacitor }, speechPlugin] = await Promise.all([
      import("@capacitor/core"),
      import("@capacitor-community/speech-recognition"),
    ]);
    useNativeSpeech =
      Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";

    if (!useNativeSpeech) return;

    NativeSpeechRecognition = speechPlugin.SpeechRecognition;
    createRecognition();
    showStatus("Dictado por voz listo. Pulsa el micrófono para empezar.");
  } catch (error) {
    console.error("No se pudo inicializar el dictado nativo.", error);
    showStatus(
      "No se pudo preparar el dictado en esta app. Puedes escribir y guardar textos.",
      "error",
    );
  }
}

function showStatus(message, type = "ready") {
  statusText.textContent = message;
  status.classList.toggle("is-recording", type === "recording");
  status.classList.toggle("is-error", type === "error");
}

function readSavedTranscriptions() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      throw new Error("El contenido guardado no tiene el formato esperado.");
    }

    return parsed.filter(
      (item) =>
        item &&
        typeof item.id === "string" &&
        typeof item.text === "string" &&
        typeof item.createdAt === "string",
    );
  } catch (error) {
    console.error("No se pudieron cargar los textos guardados.", error);
    showStatus(
      "No se pudieron cargar tus textos guardados. Revisa el almacenamiento del navegador.",
      "error",
    );
    return [];
  }
}

let transcriptions = readSavedTranscriptions();

function persistTranscriptions(nextTranscriptions) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextTranscriptions));
    transcriptions = nextTranscriptions;
    renderTranscriptions();
    return true;
  } catch (error) {
    console.error("No se pudieron guardar los textos.", error);
    showStatus(
      "No se pudo guardar. Revisa el espacio disponible en el navegador.",
      "error",
    );
    return false;
  }
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha desconocida";

  return new Intl.DateTimeFormat("es", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function downloadTranscription(item) {
  try {
    const date = new Date(item.createdAt);
    const timestamp = Number.isNaN(date.getTime())
      ? new Date().toISOString().replace(/[:.]/g, "-")
      : date.toISOString().replace(/[:.]/g, "-");
    const file = new Blob([`${item.text}\n`], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = `transcripcion-${timestamp}.txt`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch (error) {
    console.error("No se pudo descargar el archivo de texto.", error);
    showStatus(
      "El texto quedó guardado en la colección, pero no se pudo descargar el archivo.",
      "error",
    );
    return false;
  }
}

function createIconButton(label, className, iconMarkup, action, id) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `icon-button ${className}`;
  button.setAttribute("aria-label", label);
  button.title = label;
  button.innerHTML = iconMarkup;
  button.addEventListener("click", () => action(id));
  return button;
}

function renderTranscriptions() {
  savedCount.textContent = String(transcriptions.length);
  clearAllButton.hidden = transcriptions.length === 0;
  savedList.replaceChildren();

  if (transcriptions.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    const title = document.createElement("strong");
    title.textContent = "Tu colección empieza aquí";
    const description = document.createElement("span");
    description.textContent =
      "Cuando guardes una transcripción, la encontrarás en este espacio.";
    empty.append(title, description);
    savedList.append(empty);
    return;
  }

  const ordered = [...transcriptions].sort(
    (first, second) =>
      new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
  );

  for (const item of ordered) {
    const card = document.createElement("article");
    card.className = "saved-card";

    const content = document.createElement("div");
    content.className = "saved-card-content";

    const date = document.createElement("span");
    date.className = "saved-card-date";
    date.textContent = formatDate(item.createdAt);

    const text = document.createElement("p");
    text.className = "saved-card-text";
    text.textContent = item.text;
    content.append(date, text);

    const actions = document.createElement("div");
    actions.className = "saved-card-actions";
    actions.append(
      createIconButton(
        "Descargar archivo .txt",
        "download-button",
        '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 3.5v9m0 0 3.5-3.5M10 12.5 6.5 9M4 14v2.5h12V14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        (id) => {
          const itemToDownload = transcriptions.find((entry) => entry.id === id);
          if (!itemToDownload) return;
          if (downloadTranscription(itemToDownload)) {
            showStatus("Archivo .txt descargado.");
          }
        },
        item.id,
      ),
      createIconButton(
        "Abrir texto",
        "open-button",
        '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M11.5 3.5h5v5m-.5-4.5-7 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 11v4.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
        openTranscription,
        item.id,
      ),
      createIconButton(
        "Eliminar texto",
        "delete-button",
        '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4.5 6h11m-9.5 0 .6 10h7.8l.6-10m-6.5 0V4h3v2m-3 3v4m3-4v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        deleteTranscription,
        item.id,
      ),
    );

    card.append(content, actions);
    savedList.append(card);
  }
}

function openTranscription(id) {
  const item = transcriptions.find((entry) => entry.id === id);
  if (!item) return;

  if (isRecording) {
    showStatus("Detén la grabación antes de abrir otro texto.", "error");
    return;
  }

  transcriptInput.value = item.text;
  transcriptInput.focus();
  showStatus("Texto cargado. Puedes editarlo y guardarlo.");
  document.querySelector(".recording-card").scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
}

function deleteTranscription(id) {
  const nextTranscriptions = transcriptions.filter((item) => item.id !== id);
  if (persistTranscriptions(nextTranscriptions)) {
    showStatus("Texto eliminado.");
  }
}

async function startRecording() {
  if (useNativeSpeech) {
    try {
      let permission = await NativeSpeechRecognition.checkPermissions();
      if (permission.speechRecognition !== "granted") {
        permission = await NativeSpeechRecognition.requestPermissions();
      }
      if (permission.speechRecognition !== "granted") {
        showStatus("Autoriza el micrófono para empezar a dictar.", "error");
        return;
      }

      const availability = await NativeSpeechRecognition.available();
      if (!availability.available) {
        showStatus(
          "Este dispositivo no tiene un servicio de reconocimiento de voz disponible.",
          "error",
        );
        return;
      }

      transcriptBeforeRecording = transcriptInput.value.trim();
      finalSpeech = "";
      await NativeSpeechRecognition.start({
        language: languageSelect.value,
        maxResults: 5,
        partialResults: true,
        popup: false,
      });
      setRecordingState(true);
      showStatus("Te escucho... habla con naturalidad", "recording");
    } catch (error) {
      console.error("No se pudo iniciar el dictado nativo.", error);
      showStatus(
        "No se pudo iniciar el reconocimiento de voz. Revisa el permiso del micrófono y vuelve a intentarlo.",
        "error",
      );
    }
    return;
  }

  if (!recognition) {
    showStatus(
      "El reconocimiento de voz no está disponible en este navegador. Prueba Chrome o Edge.",
      "error",
    );
    return;
  }

  recognition.lang = languageSelect.value;
  transcriptBeforeRecording = transcriptInput.value.trim();
  finalSpeech = "";

  try {
    recognition.start();
  } catch (error) {
    console.error("No se pudo iniciar el reconocimiento de voz.", error);
    showStatus(
      "No se pudo iniciar el micrófono. Espera un momento e inténtalo de nuevo.",
      "error",
    );
  }
}

function stopRecording() {
  if (useNativeSpeech && isRecording) {
    NativeSpeechRecognition.stop().catch((error) => {
      console.error("No se pudo detener el dictado nativo.", error);
      showStatus("No se pudo detener el micrófono correctamente.", "error");
      setRecordingState(false);
    });
    setRecordingState(false);
    showStatus("Transcripción lista. Puedes editarla y guardarla.");
    return;
  }

  if (recognition && isRecording) {
    recognition.stop();
  }
}

function setRecordingState(recording) {
  isRecording = recording;
  transcriptInput.readOnly = recording;
  recordButton.classList.toggle("is-recording", recording);
  recordButton.setAttribute("aria-pressed", String(recording));
  liveIndicator.hidden = !recording;
  recordButtonLabel.textContent = recording
    ? "Terminar grabación"
    : "Empezar a hablar";
  recordButton.querySelector(".mic-icon").innerHTML = recording
    ? '<rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor"/>'
    : '<path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Z" stroke="currentColor" stroke-width="1.8"/><path d="M19 11.5a7 7 0 0 1-14 0M12 18.5V22m-4 0h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>';
}

function createRecognition() {
  if (useNativeSpeech) {
    nativePartialListener = NativeSpeechRecognition.addListener(
      "partialResults",
      ({ matches }) => {
        if (!isRecording || !matches?.length) return;
        finalSpeech = matches[0];
        transcriptInput.value = [transcriptBeforeRecording, finalSpeech]
          .filter(Boolean)
          .join(" ");
      },
    );
    nativeStateListener = NativeSpeechRecognition.addListener(
      "listeningState",
      ({ status: listeningStatus }) => {
        if (listeningStatus === "stopped" && isRecording) {
          setRecordingState(false);
          showStatus("Transcripción lista. Puedes editarla y guardarla.");
        }
      },
    );
    return;
  }

  if (!SpeechRecognition) return;

  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onstart = () => {
    setRecordingState(true);
    showStatus("Te escucho... habla con naturalidad", "recording");
  };

  recognition.onresult = (event) => {
    let interim = "";

    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index];
      if (result.isFinal) {
        finalSpeech += result[0].transcript;
      } else {
        interim += result[0].transcript;
      }
    }

    const spokenText = `${finalSpeech}${interim}`.trim();
    transcriptInput.value = [transcriptBeforeRecording, spokenText]
      .filter(Boolean)
      .join(" ");
  };

  recognition.onerror = (event) => {
    const messages = {
      "not-allowed":
        "No hay permiso para usar el micrófono. Autoriza el acceso en tu navegador.",
      "service-not-allowed":
        "El navegador no permite el reconocimiento de voz en esta página.",
      "no-speech": "No se detectó voz. Puedes intentarlo de nuevo cuando quieras.",
      "audio-capture": "No se encontró un micrófono disponible.",
      "network": "Falló la conexión necesaria para reconocer la voz. Inténtalo de nuevo.",
      "language-not-supported":
        "El idioma seleccionado no está disponible para el reconocimiento.",
    };

    const message =
      messages[event.error] ||
      `Ocurrió un error con el reconocimiento de voz (${event.error}).`;
    showStatus(message, "error");
  };

  recognition.onend = () => {
    setRecordingState(false);
    if (!status.classList.contains("is-error")) {
      showStatus(
        transcriptInput.value.trim()
          ? "Transcripción lista. Puedes editarla y guardarla."
          : "Grabación terminada. No se reconoció texto.",
      );
    }
  };
}

recordButton.addEventListener("click", () => {
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
});

saveButton.addEventListener("click", () => {
  if (isRecording) {
    showStatus("Termina la grabación antes de guardar el texto.", "error");
    return;
  }

  const text = transcriptInput.value.trim();
  if (!text) {
    showStatus("Escribe o dicta un texto antes de guardarlo.", "error");
    transcriptInput.focus();
    return;
  }

  const id =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const nextTranscriptions = [
    ...transcriptions,
    { id, text, createdAt: new Date().toISOString() },
  ];

  if (persistTranscriptions(nextTranscriptions)) {
    if (downloadTranscription(nextTranscriptions[nextTranscriptions.length - 1])) {
      showStatus("Texto guardado en la colección y archivo .txt descargado.");
    }
  }
});

clearButton.addEventListener("click", () => {
  if (isRecording) {
    showStatus("Detén la grabación antes de limpiar el texto.", "error");
    return;
  }

  transcriptInput.value = "";
  showStatus("Campo de texto limpio.");
  transcriptInput.focus();
});

clearAllButton.addEventListener("click", () => {
  if (!window.confirm("¿Quieres borrar todos los textos guardados?")) return;

  if (persistTranscriptions([])) {
    showStatus("Se borraron todos los textos guardados.");
  }
});

renderTranscriptions();
setupAppInstallation();
setupNativeSpeech();

if (!SpeechRecognition) {
  showStatus(
    "El dictado no es compatible con este navegador. Aún puedes escribir y guardar textos.",
    "error",
  );
}

if (SpeechRecognition) createRecognition();
