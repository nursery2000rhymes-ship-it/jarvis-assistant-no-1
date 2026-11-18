/* J.A.R.V.I.S. - client-side assistant controller
 * Voice uses Android/Chrome speech services. This is not an unrestricted
 * Android device controller and does not contain a ChatGPT API key.
 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const log = $('log');
  const status = $('status');
  const hint = $('hint');
  const voiceState = $('voiceState');
  let speechLanguage = localStorage.getItem('jarvis-language') || 'en-IN';
  let voices = [];
  let recognition = null;
  let listening = false;

  const setHint = message => { if (hint) hint.textContent = message; };
  const add = (who, message) => {
    const row = document.createElement('div');
    row.className = 'entry ' + (who === 'YOU' ? 'user' : 'jarvis');
    const label = document.createElement('b');
    label.textContent = who;
    const body = document.createElement('p');
    body.textContent = message;
    row.append(label, body);
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
  };

  function loadVoices() {
    if ('speechSynthesis' in window) voices = window.speechSynthesis.getVoices() || [];
  }
  if ('speechSynthesis' in window) {
    loadVoices();
    window.speechSynthesis.addEventListener?.('voiceschanged', loadVoices);
  }

  function chooseVoice(text) {
    loadVoices();
    const hindiText = /[\u0900-\u097F]/.test(text);
    const wanted = hindiText ? 'hi-IN' : speechLanguage;
    return voices.find(v => (v.lang || '').toLowerCase() === wanted.toLowerCase())
      || voices.find(v => (v.lang || '').toLowerCase().startsWith(wanted.slice(0, 2).toLowerCase()))
      || voices.find(v => /india|indian/i.test(v.name || ''))
      || voices.find(v => (v.lang || '').toLowerCase().startsWith('en'))
      || null;
  }

  function speak(message) {
    if (!('speechSynthesis' in window)) {
      setHint('SPEECH NOT SUPPORTED // ENABLE ANDROID TEXT-TO-SPEECH');
      return;
    }
    window.speechSynthesis.cancel();
    const hindiText = /[\u0900-\u097F]/.test(message);
    const utterance = new SpeechSynthesisUtterance(message);
    const voice = chooseVoice(message);
    utterance.lang = voice?.lang || (hindiText ? 'hi-IN' : speechLanguage);
    if (voice) utterance.voice = voice;
    utterance.rate = 0.92;
    utterance.pitch = 0.88;
    utterance.volume = 1;
    utterance.onstart = () => setHint('JARVIS SPEAKING // VOICE LINK ACTIVE');
    utterance.onend = () => setHint('◈ TAP THE ARC REACTOR TO SPEAK ◈');
    utterance.onerror = () => setHint('VOICE ERROR // CHECK GOOGLE TEXT-TO-SPEECH SETTINGS');
    window.speechSynthesis.speak(utterance);
  }

  function reply(message, options = {}) {
    add('JARVIS', message);
    if (options.speak !== false) speak(message);
  }

  function launchIntent(url, message) {
    reply(message);
    // Android/Chrome decides whether the requested app or settings page can open.
    window.location.href = url;
  }

  function openApp(packageName, webUrl, label) {
    const intent = `intent://${webUrl.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=${packageName};end`;
    launchIntent(intent, `Opening ${label}. If it is not installed, I will leave the request to Android.`);
  }

  function setLanguage(language) {
    speechLanguage = language;
    localStorage.setItem('jarvis-language', language);
    if (recognition) recognition.lang = language;
  }

  function helpText() {
    return 'You can ask me for the time or date, say Hindi mode or English mode, open YouTube, WhatsApp, Chrome, Maps, Settings, Wi-Fi settings, Bluetooth settings, or Calculator, search the web, or say call followed by a phone number. Phone actions are limited by Android security.';
  }

  function localCommand(original) {
    const q = original.trim().toLowerCase();

    if (/^(help|commands|what can you do)\??$/.test(q)) {
      reply(helpText()); return true;
    }
    if (/^(hindi mode|हिंदी मोड|हिंदी में बोलो)$/.test(q)) {
      setLanguage('hi-IN');
      reply('हिंदी भाषा सक्रिय है। बताइए, मैं आपकी क्या सहायता करूँ?'); return true;
    }
    if (/^(english mode|अंग्रेज़ी मोड|speak english)$/.test(q)) {
      setLanguage('en-IN');
      reply('Indian English voice mode is active. How may I assist you?'); return true;
    }
    if (/^(hello|hi|hey|namaste)\b/.test(q) || q.startsWith('नमस्ते')) {
      reply(speechLanguage === 'hi-IN'
        ? 'नमस्ते। JARVIS ऑनलाइन है और आपकी सहायता के लिए तैयार है।'
        : 'Hello. JARVIS is online and ready. How may I assist you?'); return true;
    }
    if (q.includes('time')) {
      reply('The local time is ' + new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) + '.'); return true;
    }
    if (q.includes('date') || q.includes('today')) {
      reply('Today is ' + new Date().toLocaleDateString(undefined, {weekday:'long', year:'numeric', month:'long', day:'numeric'}) + '.'); return true;
    }
    if (q.includes('who are you')) {
      reply('I am JARVIS, your personal assistant interface. I can speak, listen, handle basic commands and open supported Android apps and settings.'); return true;
    }
    if (q.includes('system status')) {
      reply('The JARVIS interface is online. Speech and supported app shortcuts are available. Secure ChatGPT integration and native device-control permissions are not configured.'); return true;
    }
    if (/\b(open|launch|start)\s+(youtube|यूट्यूब)\b/.test(q)) {
      openApp('com.google.android.youtube', 'www.youtube.com/', 'YouTube'); return true;
    }
    if (/\b(open|launch|start)\s+(whatsapp|व्हाट्सऐप)\b/.test(q)) {
      launchIntent('intent://send/#Intent;scheme=whatsapp;package=com.whatsapp;end', 'Opening WhatsApp.'); return true;
    }
    if (/\b(open|launch|start)\s+(chrome|browser)\b/.test(q)) {
      openApp('com.android.chrome', 'www.google.com/', 'Chrome'); return true;
    }
    if (/\b(open|launch|start)\s+(maps|google maps)\b/.test(q)) {
      openApp('com.google.android.apps.maps', 'maps.google.com/', 'Google Maps'); return true;
    }
    if (/\b(open|launch|start)\s+(calculator|calc)\b/.test(q)) {
      launchIntent('intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.APP_CALCULATOR;end', 'Requesting Android Calculator.'); return true;
    }
    if (/\b(open|show)\s+(phone )?settings\b/.test(q)) {
      launchIntent('intent:#Intent;action=android.settings.SETTINGS;end', 'Opening Android Settings.'); return true;
    }
    if (/\b(open|show)\s+(wi-?fi|wifi) settings\b/.test(q)) {
      launchIntent('intent:#Intent;action=android.settings.WIFI_SETTINGS;end', 'Opening Wi-Fi settings. Please change the setting yourself.'); return true;
    }
    if (/\b(open|show)\s+bluetooth settings\b/.test(q)) {
      launchIntent('intent:#Intent;action=android.settings.BLUETOOTH_SETTINGS;end', 'Opening Bluetooth settings. Please change the setting yourself.'); return true;
    }
    if (/\b(open|show)\s+(camera|कैमरा)\b/.test(q)) {
      launchIntent('intent:#Intent;action=android.media.action.IMAGE_CAPTURE;end', 'Opening the camera if Android allows this shortcut.'); return true;
    }
    const call = q.match(/^(?:call|dial|फोन लगाओ)\s+(\+?[0-9][0-9\s-]{5,})$/);
    if (call) {
      const number = call[1].replace(/[^\d+]/g, '');
      launchIntent('tel:' + encodeURIComponent(number), 'Opening the phone dialer. Review the number and confirm the call yourself.'); return true;
    }
    const sms = q.match(/^(?:text|sms|message)\s+(\+?[0-9][0-9\s-]{5,})\s+(.+)$/i);
    if (sms) {
      const number = sms[1].replace(/[^\d+]/g, '');
      launchIntent('sms:' + encodeURIComponent(number) + '?body=' + encodeURIComponent(sms[2]), 'Opening your messaging app with a draft. Review and send it yourself.'); return true;
    }
    const search = q.match(/^(?:search|google)\s+(.+)$/i);
    if (search) {
      window.open('https://www.google.com/search?q=' + encodeURIComponent(search[1]), '_blank', 'noopener');
      reply('Here are the web search results.'); return true;
    }
    if (q.includes('control my phone') || q.includes('phone control') || q.includes('turn on wifi') || q.includes('turn on bluetooth') || q.includes('flashlight')) {
      reply('I can open supported apps, the dialer and Android settings. Android does not let a website directly toggle protected settings, control the flashlight, read contacts or operate the whole phone. Those features require a native Android app with explicit permissions.'); return true;
    }
    return false;
  }

  function respond(message) {
    if (localCommand(message)) return;
    reply('I have received your message. My local assistant can handle supported commands, but the ChatGPT brain is not connected yet. OPEN CHATGPT opens ChatGPT separately. To answer general questions inside this interface, a secure server connection and separately billed API access are required.');
  }

  function submit(message) {
    const text = (message || '').trim();
    if (!text) return;
    add('YOU', text);
    $('prompt').value = '';
    respond(text);
  }

  $('chatForm').addEventListener('submit', event => {
    event.preventDefault();
    submit($('prompt').value);
  });
  $('chatgpt').addEventListener('click', () => {
    window.open('https://chatgpt.com/', '_blank', 'noopener');
  });
  $('clear').addEventListener('click', () => {
    log.innerHTML = '';
    reply('Communication log cleared.');
  });

  function updateClock() {
    $('clock').textContent = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
  }
  updateClock();
  setInterval(updateClock, 30000);
  function updateNetwork() { $('network').textContent = navigator.onLine ? 'ONLINE' : 'OFFLINE'; }
  updateNetwork();
  window.addEventListener('online', updateNetwork);
  window.addEventListener('offline', updateNetwork);

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = speechLanguage;
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onstart = () => {
      listening = true;
      status.textContent = 'VOICE ACTIVE';
      voiceState.textContent = 'LISTENING';
      setHint('LISTENING... SPEAK NOW');
    };
    recognition.onend = () => {
      listening = false;
      status.textContent = 'SYSTEM ONLINE';
      voiceState.textContent = 'READY';
      if (!window.speechSynthesis?.speaking) setHint('◈ TAP THE ARC REACTOR TO SPEAK ◈');
    };
    recognition.onerror = event => {
      setHint('VOICE INPUT ' + String(event.error || 'ERROR').toUpperCase() + ' // TYPE BELOW');
    };
    recognition.onresult = event => submit(event.results[0][0].transcript);
    $('core').addEventListener('click', () => {
      if (listening) { recognition.stop(); return; }
      try {
        recognition.lang = speechLanguage;
        recognition.start();
      } catch (_) {
        setHint('VOICE LISTENER BUSY // TAP AGAIN');
      }
    });
  } else {
    $('core').addEventListener('click', () => setHint('VOICE INPUT NOT SUPPORTED IN THIS BROWSER // TYPE BELOW'));
  }

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }

  // Initial greeting is visible, but does not speak unexpectedly on page load.
  setHint('◈ TAP THE ARC REACTOR TO SPEAK ◈');
})();
