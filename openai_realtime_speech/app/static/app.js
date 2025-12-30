const btnStart = document.getElementById("btnStart");
const btnStop = document.getElementById("btnStop");
const statusEl = document.getElementById("status");

let pc = null;
let localStream = null;

function setStatus(msg) {
  statusEl.textContent = msg;
}

async function getClientSecret() {
  const r = await fetch("/api/client_secret", { method: "POST" });
  if (!r.ok) throw new Error(`client_secret failed: ${r.status} ${await r.text()}`);
  return r.json();
}

// Minimal WebRTC -> OpenAI Realtime call flow:
// 1) Create RTCPeerConnection, add mic track, set up ontrack playback
// 2) Create SDP offer, send to OpenAI /v1/realtime/calls with Authorization: Bearer <ephemeral secret>
// 3) Receive SDP answer, setRemoteDescription
async function start() {
  btnStart.disabled = true;
  btnStop.disabled = false;

  try {
    setStatus("Requesting microphone...");
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });

    setStatus("Requesting ephemeral client secret from add-on...");
    const { client_secret } = await getClientSecret();
    if (!client_secret) throw new Error("Missing client_secret in response.");

    setStatus("Creating WebRTC peer connection...");
    pc = new RTCPeerConnection();

    // Play remote audio
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      let audio = document.getElementById("remoteAudio");
      if (!audio) {
        audio = document.createElement("audio");
        audio.id = "remoteAudio";
        audio.autoplay = true;
        audio.controls = true;
        document.body.appendChild(audio);
      }
      audio.srcObject = remoteStream;
    };

    // Add mic track
    for (const track of localStream.getTracks()) {
      pc.addTrack(track, localStream);
    }

    setStatus("Creating SDP offer...");
    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: false,
    });
    await pc.setLocalDescription(offer);

    setStatus("Sending offer to OpenAI Realtime /calls...");
    const form = new FormData();
    form.append("sdp", new Blob([offer.sdp], { type: "application/sdp" }), "offer.sdp");
    // The server preconfigures session via client_secrets; you can also pass session here if desired.

    const resp = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${client_secret}`,
      },
      body: form,
    });

    if (!resp.ok) throw new Error(`OpenAI /calls failed: ${resp.status} ${await resp.text()}`);
    const answerSdp = await resp.text();

    setStatus("Applying SDP answer...");
    await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

    setStatus("Connected. Speak normally.");
  } catch (e) {
    console.error(e);
    setStatus(`Error: ${e.message}`);
    await stop();
  }
}

async function stop() {
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

btnStart.addEventListener("click", start);
btnStop.addEventListener("click", stop);
