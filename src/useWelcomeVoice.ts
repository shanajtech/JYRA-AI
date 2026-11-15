import { useCallback, useEffect, useRef, useState } from 'react';
import type { CompanionId } from './companionProfiles';

// Pre-generated English greetings; no typed form values are sent to a voice service.
export function useWelcomeVoice() {
  const [speaking, setSpeaking] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const audio = useRef<HTMLAudioElement | null>(null);
  const context = useRef<AudioContext | null>(null);
  const level = useRef(0);
  const frame = useRef(0);
  const sequence = useRef(0);
  const disconnect = useRef<(() => void) | null>(null);

  const stop = useCallback(() => {
    sequence.current++;
    audio.current?.pause();
    disconnect.current?.();
    disconnect.current = null;
    audio.current = null;
    cancelAnimationFrame(frame.current);
    level.current = 0;
    setSpeaking(false);
  }, []);

  const play = useCallback(async (mode: string, profile: CompanionId, automatic = false) => {
    stop();
    setVoiceError('');
    const run = sequence.current;
    const clip = mode === 'password' ? 'password' : mode === 'signup' ? 'signup' : 'login';
    const player = new Audio(/^data:audio\/(wav|mpeg);base64,/.test(mode) ? mode : mode === 'developer-en' ? '/voice/developer-en.wav' : mode === 'developer-bn' ? '/voice/developer-bn.mp3' : mode === 'website' ? '/voice/website-welcome-en.wav?v=jyra-ipa-2' : profile === 'female' ? `/voice/jyra-${clip}-en.wav?v=jyra-ipa-2` : `/voice/${profile}-${clip}-en.mp3`);
    audio.current = player;
    let analyser: AnalyserNode | null = null;
    let source: MediaElementAudioSourceNode | null = null;
    // AudioContext is optional: voice still plays when analysis is unsupported.
    try {
      context.current ??= new AudioContext();
      if (!automatic || navigator.userActivation?.hasBeenActive) await context.current.resume();
      if (run !== sequence.current) return;
      if (context.current.state === 'running') {
        analyser = context.current.createAnalyser();
        analyser.fftSize = 256;
        source = context.current.createMediaElementSource(player);
        source.connect(analyser);
        analyser.connect(context.current.destination);
        disconnect.current = () => { source?.disconnect(); analyser?.disconnect(); };
      }
    } catch { /* Keep native audio playback available. */ }
    const samples = new Uint8Array(256);
    const tick = () => {
      if (run !== sequence.current) return;
      if (analyser) {
        analyser.getByteTimeDomainData(samples);
        const rms = Math.sqrt(samples.reduce((sum, n) => sum + ((n - 128) / 128) ** 2, 0) / samples.length);
        level.current = level.current * .35 + Math.min(1, rms * 9) * .65;
      } else {
        level.current = 0; // Do not invent speech motion without an audio signal.
      }
      frame.current = requestAnimationFrame(tick);
    };
    const finish = () => {
      source?.disconnect(); analyser?.disconnect();
      if (run === sequence.current) stop();
    };
    player.onended = finish;
    player.onerror = () => {
      if (run === sequence.current) setVoiceError('Voice could not load. Please try again.');
      finish();
    };
    try {
      if (run !== sequence.current) return;
      await player.play();
      if (run !== sequence.current) { player.pause(); return; }
      setSpeaking(true);
      tick();
    } catch (error) {
      if (run !== sequence.current) return;
      if (!automatic) setVoiceError('Please press Hear welcome to play the voice.');
      finish();
    }
  }, [stop]);

  useEffect(() => () => {
    audio.current?.pause();
    disconnect.current?.();
    cancelAnimationFrame(frame.current);
    void context.current?.close();
    context.current = null;
  }, []);
  return { speaking, voiceError, level, play, stop };
}
