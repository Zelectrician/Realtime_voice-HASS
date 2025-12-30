const btnStart = document.getElementById("btnStart");
const btnStop = document.getElementById("btnStop");
const statusEl = document.getElementById("status");
const remoteAudio = document.getElementById("remoteAudio");

const wakeEnabled = document.getElementById("wakeEnabled");
const wakePhraseEl = document.getElementById("wakePhrase");
const btnWake = document.getElementById("btnWake");
const btnWakeStop = document.getElementById("btnWakeStop");

let pc = null;
let localStream = null;

let recognizer = null;
let wakeListening = false;

function setStatus(msg) {
  statusEl.textContent = msg;
}

async function createPeerAndOffer() {
  pc = new RTCPeerConnection();

  pc.ontrack = (event) => {
    const [remoteStream] = event.streams;
    remoteAudio.srcObject = remoteStream;
  };

  localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  for (const track of localStream.getTracks()) {
    pc.addTrack(track, localStream);
  }

  const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: false });
  await pc.setLocalDescription(offer);
  return offer.sdp;
}

async function postSdpToAddon(offerSdp) {
  const r = await fetch("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/sdp" },
    body: offerSdp
  });
  if (!r.ok) throw new Error(`/api/session failed: ${r.status} ${await r.text()}`);
  return r.text();
}

async function startCall() {
  btnStart.disabled = true;
  btnStop.disabled = false;

  try {
    setStatus("Creating WebRTC offer...");
    const offerSdp = await createPeerAndOffer();

    setStatus("Sending offer to add-on (server will call OpenAI)...");
    const answerSdp = await postSdpToAddon(offerSdp);

    setStatus("Applying SDP answer...");
    await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

    setStatus("Connected. Speak normally.");
  } catch (e) {
    console.error(e);
    setStatus(`Error: ${e.message}`);
    await stopCall();
  }
}

async function stopCall() {
  btnStop.disabled = true;
  btnStart.disabled = false;

  if (pc) {
    try { pc.close(); } catch (_) {}
    pc = null;
  }
  if (localStream) {
    for (const t of localStream.getTracks()) t.stop();
    localStream = null;
  }
  setStatus("Idle");
}

btnStart.addEventListener("click", startCall);
btnStop.addEventListener("click", stopCall);

/* Wake word (browser SpeechRecognition)
   Note: This is NOT offline on most browsers; it uses the browser's speech service.
*/
function supportsSpeechRecognition() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

function startWakeListening() {
  if (!supportsSpeechRecognition()) {
    setStatus("Wake word error: SpeechRecognition not supported in this browser.");
    return;
  }
  if (wakeListening) return;

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognizer = new SR();
  recognizer.continuous = true;
  recognizer.interimResults = true;
  recognizer.lang = "en-US";

  recognizer.onresult = async (event) => {
    const phrase = (wakePhraseEl.value || "").trim().toLowerCase();
    if (!phrase) return;

    // Look at the most recent result chunk
    const res = event.results[event.results.length - 1];
    if (!res || !res[0]) return;
    const text = (res[0].transcript || "").trim().toLowerCase();

    if (wakeEnabled.checked && text.includes(phrase)) {
      setStatus(`Wake phrase detected ("${phrase}"). Starting call...`);
      stopWakeListening();
      if (!pc) await startCall();
    }
  };

  recognizer.onerror = (e) => {
    setStatus(`Wake word error: ${e.error || "unknown"}`);
  };

  recognizer.onend = () => {
    // Some browsers stop recognition after a while; optionally auto-restart.
    if (wakeListening) {
      try { recognizer.start(); } catch (_) {}
    }
  };

  wakeListening = true;
  btnWake.disabled = true;
  btnWakeStop.disabled = false;
  setStatus("Wake listening: ON");

  try { recognizer.start(); } catch (e) {
    setStatus(`Wake start failed: ${e.message}`);
  }
}

function stopWakeListening() {
  wakeListening = false;
  btnWake.disabled = false;
  btnWakeStop.disabled = true;

  if (recognizer) {
    try { recognizer.onend = null; recognizer.stop(); } catch (_) {}
    recognizer = null;
  }
  setStatus("Wake listening: OFF");
}

btnWake.addEventListener("click", startWakeListening);
btnWakeStop.addEventListener("click", stopWakeListening);
