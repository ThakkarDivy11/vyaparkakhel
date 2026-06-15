// Web Audio API Synthesizer for game sound effects.
// Uses Web Audio API so it works out-of-the-box without requiring static audio file assets.

let audioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  // Initialize context on demand
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  // Resume context if suspended (browser security autoplays)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playPawnHop(stepIndex = 0) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Check if vk_sound is turned off in localStorage
    if (localStorage.getItem('vk_sound') === 'off') return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Dynamic pitch based on step index (slightly ascending pitch)
    const baseFreq = 320 + (stepIndex * 15);
    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    // Frequency slide up slightly
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.25, ctx.currentTime + 0.08);

    osc.type = 'triangle'; // pleasant, soft tone

    // Volume envelope: fast attack, quick decay
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
  } catch (e) {
    console.warn('Web Audio Playback failed:', e);
  }
}

export function playPawnLand() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Check if vk_sound is turned off in localStorage
    if (localStorage.getItem('vk_sound') === 'off') return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine'; // very pure, warm tone
    osc.frequency.setValueAtTime(240, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(160, ctx.currentTime + 0.18);

    // Volume envelope
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);
  } catch (e) {
    console.warn('Web Audio Playback failed:', e);
  }
}

export function playDiceRoll() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Check if vk_sound is turned off in localStorage
    if (localStorage.getItem('vk_sound') === 'off') return;

    const now = ctx.currentTime;
    const clicks = 6;
    const duration = 0.55;

    for (let i = 0; i < clicks; i++) {
      const clickTime = now + (i * (duration / clicks)) + (Math.random() * 0.02);
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'triangle';
      
      // Lower pitches for dice rolling sounds
      const freq = 160 + Math.random() * 120;
      osc.frequency.setValueAtTime(freq, clickTime);
      
      // Fast pitch drop to sound like an impact
      osc.frequency.exponentialRampToValueAtTime(freq * 0.5, clickTime + 0.05);

      // Volume envelope (louder gain and slightly longer decay)
      gain.gain.setValueAtTime(0, clickTime);
      gain.gain.linearRampToValueAtTime(0.6, clickTime + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, clickTime + 0.08);

      osc.start(clickTime);
      osc.stop(clickTime + 0.09);
    }
  } catch (e) {
    console.warn('Web Audio Playback failed:', e);
  }
}

