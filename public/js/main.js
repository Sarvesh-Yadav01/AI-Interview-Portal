const chartCanvas = document.getElementById("scoreChart");

if (chartCanvas) {
  const labels = JSON.parse(chartCanvas.dataset.labels || "[]");
  const scores = JSON.parse(chartCanvas.dataset.scores || "[]");

  new Chart(chartCanvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Score",
          data: scores,
          borderColor: "#0ea5a3",
          backgroundColor: "rgba(14, 165, 163, 0.14)",
          fill: true,
          tension: 0.35
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          min: 0,
          max: 100
        }
      }
    }
  });
}

const timer = document.getElementById("timer");

if (timer) {
  let remaining = Number(timer.dataset.minutes || 10) * 60;
  setInterval(() => {
    if (remaining <= 0) {
      return;
    }

    remaining -= 1;
    const minutes = String(Math.floor(remaining / 60)).padStart(2, "0");
    const seconds = String(remaining % 60).padStart(2, "0");
    timer.textContent = `${minutes}:${seconds}`;

    if (remaining === 0) {
      const form = document.getElementById("interviewForm");
      if (form) form.submit();
    }
  }, 1000);
}

const enableProctoring = document.getElementById("enableProctoring");
const submitInterview = document.getElementById("submitInterview");
const securityEventsInput = document.getElementById("securityEvents");
const webcamEnabledInput = document.getElementById("webcamEnabled");
const screenShareEnabledInput = document.getElementById("screenShareEnabled");
const cameraPreview = document.getElementById("cameraPreview");

if (enableProctoring && submitInterview) {
  const events = [];
  let warningCount = 0;
  let terminated = false;
  let proctoringActive = false;

  function logSecurityEvent(message) {
    const event = `${new Date().toISOString()} - ${message}`;
    events.push(event);
    if (securityEventsInput) {
      securityEventsInput.value = events.slice(-20).join("\n");
    }
  }

  async function terminateExam(reason) {
    if (terminated) return;
    terminated = true;
    logSecurityEvent(reason);

    try {
      const response = await fetch("/interview/terminate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason })
      });
      const data = await response.json();
      window.location.href = data.redirect || "/interview";
    } catch (error) {
      window.location.href = "/interview";
    }
  }

  function warnCamera(reason) {
    warningCount += 1;
    logSecurityEvent(`Camera warning ${warningCount}: ${reason}`);
    alert(`Security warning ${warningCount}/4: ${reason}`);

    if (warningCount >= 4) {
      terminateExam("Camera proctoring warning limit reached.");
    }
  }

  enableProctoring.addEventListener("click", async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      const screenTrack = screenStream.getVideoTracks()[0];
      const cameraTrack = cameraStream.getVideoTracks()[0];

      screenTrack.addEventListener("ended", () => terminateExam("Screen sharing was stopped."));
      cameraTrack.addEventListener("ended", () => terminateExam("Camera was stopped."));
      if (cameraPreview) {
        cameraPreview.srcObject = cameraStream;
      }
      if (webcamEnabledInput) webcamEnabledInput.value = "true";
      if (screenShareEnabledInput) screenShareEnabledInput.value = "true";

      enableProctoring.textContent = "Proctoring Active";
      enableProctoring.disabled = true;
      proctoringActive = true;
      logSecurityEvent("Camera and screen sharing enabled.");

      setInterval(() => {
        if (document.hidden) {
          terminateExam("Candidate switched tab or minimized the exam window.");
        }
        if (cameraTrack.readyState !== "live" || cameraTrack.muted) {
          warnCamera("Camera feed is not active.");
        }
      }, 5000);
    } catch (error) {
      logSecurityEvent("Candidate denied camera or screen permission.");
      alert("Camera and screen sharing permission is compulsory before starting the exam.");
    }
  });

  window.addEventListener("blur", () => {
    if (!proctoringActive) return;
    terminateExam("Candidate moved focus away from the exam window.");
  });

  document.addEventListener("visibilitychange", () => {
    if (!proctoringActive) return;
    if (document.hidden) {
      terminateExam("Candidate switched away from the exam tab.");
    }
  });
}

const voiceButtons = document.querySelectorAll(".voice-record");
const voiceTranscriptInput = document.getElementById("voiceTranscript");

if (voiceButtons.length) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let activeRecognition = null;

  function appendTranscript(text) {
    if (!voiceTranscriptInput) return;
    voiceTranscriptInput.value = `${voiceTranscriptInput.value || ""}\n${new Date().toISOString()} - ${text}`.trim();
  }

  voiceButtons.forEach((button) => {
    const state = button.parentElement ? button.parentElement.querySelector(".voice-state") : null;

    if (!SpeechRecognition) {
      button.disabled = true;
      if (state) state.textContent = "Speech capture is not supported in this browser";
      return;
    }

    button.addEventListener("click", () => {
      const target = document.querySelector(`[name="${button.dataset.target}"]`);
      if (!target) return;

      if (activeRecognition) {
        activeRecognition.stop();
        activeRecognition = null;
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = "en-IN";
      recognition.interimResults = true;
      recognition.continuous = true;
      activeRecognition = recognition;
      button.textContent = "Stop Voice Answer";
      if (state) state.textContent = "Listening...";

      recognition.onresult = (event) => {
        let finalText = "";
        let interimText = "";
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const transcript = event.results[index][0].transcript;
          if (event.results[index].isFinal) {
            finalText += transcript;
          } else {
            interimText += transcript;
          }
        }

        if (finalText) {
          target.value = `${target.value} ${finalText}`.trim();
          appendTranscript(finalText);
        }
        if (state) state.textContent = interimText ? `Hearing: ${interimText.slice(0, 80)}` : "Listening...";
      };

      recognition.onerror = () => {
        if (state) state.textContent = "Voice capture stopped";
      };

      recognition.onend = () => {
        activeRecognition = null;
        button.textContent = "Start Voice Answer";
        if (state) state.textContent = "Speech capture ready";
      };

      recognition.start();
    });
  });
}
