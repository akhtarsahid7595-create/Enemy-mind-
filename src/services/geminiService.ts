import { GoogleGenAI, Type, Modality } from "@google/genai";
import Groq from "groq-sdk";
import { EnemyMoveType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
const groq = new Groq({ 
  apiKey: process.env.GROQ_API_KEY || '',
  dangerouslyAllowBrowser: true 
});

export async function getCounterMove(move: {
  type: EnemyMoveType;
  description: string;
  trigger: string;
  impact: number;
  relatedArea?: string;
}) {
  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content: "You are an 'Enemy Mind' coach. Your goal is to neutralize self-sabotage with short, punchy, non-jargon counter-moves and psychological insights."
      },
      {
        role: "user",
        content: `Analyze this "Enemy Move" (self-sabotaging pattern) and provide a counter-move.
        Type: ${move.type}
        Description: ${move.description}
        Trigger: ${move.trigger}
        Impact: ${move.impact}/5
        Related Area: ${move.relatedArea || 'None'}

        Provide:
        1. One self-talk line (SELF_TALK)
        2. One tiny physical action (ACTION)
        3. The hidden 'If-Then' trap (ENEMY_IF_THEN)
        4. A counter 'If-Then' (COUNTER_IF_THEN)
        5. Identify the cognitive distortion/manipulation tactic (SHIELD_TACTIC)
        6. A reality check (SHIELD_REALITY)
        7. A better thought (SHIELD_BETTER_THOUGHT)

        Format exactly:
        SELF_TALK: <sentence>
        ACTION: <sentence>
        ENEMY_IF_THEN: <If X, then I do Y>
        COUNTER_IF_THEN: <If X, then I will do Z>
        SHIELD_TACTIC: <tactic name>
        SHIELD_REALITY: <one line reality check>
        SHIELD_BETTER_THOUGHT: <one line better thought>`
      }
    ],
    model: "llama-3.3-70b-versatile",
  });

  const text = completion.choices[0]?.message?.content || "";
  
  const getValue = (key: string) => {
    const match = text.match(new RegExp(`${key}:\\s*(.*)`, 'i'));
    return match ? match[1].trim() : "";
  };

  return {
    selfTalk: getValue("SELF_TALK") || "I am observing this pattern, but I am not defined by it.",
    action: getValue("ACTION") || "Take 5 deep breaths and stand up.",
    ifThenTrap: {
      enemy: getValue("ENEMY_IF_THEN"),
      counter: getValue("COUNTER_IF_THEN")
    },
    shield: {
      tactic: getValue("SHIELD_TACTIC"),
      reality: getValue("SHIELD_REALITY"),
      betterThought: getValue("SHIELD_BETTER_THOUGHT")
    }
  };
}

export async function getIdentityAlignment(scripts: string[], statsSummary: string) {
  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content: "You are an 'Identity Alignment' coach. You compare a user's chosen identity scripts with their actual behavior stats."
      },
      {
        role: "user",
        content: `Identity Scripts: ${scripts.join(", ")}
        Weekly Stats: ${statsSummary}

        Provide a 1-2 line punchy summary of where the user acted like their chosen self vs against it.
        Format:
        ALIGNMENT: <sentence>`
      }
    ],
    model: "llama-3.3-70b-versatile",
  });

  const text = completion.choices[0]?.message?.content || "";
  const match = text.match(/ALIGNMENT:\s*(.*)/i);
  return match ? match[1].trim() : "You are in the process of aligning your actions with your chosen identity.";
}

export async function getExperimentProposal(statsSummary: string) {
  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content: "You are a 'Behavioral Experiment' designer. You propose dark but ethical 'hacks' to break the Enemy Mind's patterns."
      },
      {
        role: "user",
        content: `Based on these patterns: ${statsSummary}
        Propose one 3-day experiment to hack the Enemy Mind.
        
        Format:
        TITLE: <short title>
        HYPOTHESIS: <If I do X when I feel Y, then Z will happen>`
      }
    ],
    model: "llama-3.3-70b-versatile",
  });

  const text = completion.choices[0]?.message?.content || "";
  const titleMatch = text.match(/TITLE:\s*(.*)/i);
  const hypothesisMatch = text.match(/HYPOTHESIS:\s*(.*)/i);

  return {
    title: titleMatch ? titleMatch[1].trim() : "The 5-Minute Delay",
    hypothesis: hypothesisMatch ? hypothesisMatch[1].trim() : "If I delay the urge by 5 minutes, the intensity will decrease."
  };
}

export async function getWeeklyInsights(statsSummary: string) {
  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content: "You are an 'Enemy Mind' pattern analyst. Convert stats into punchy, actionable insights. No fluff."
      },
      {
        role: "user",
        content: `Based on this weekly summary of "Enemy Moves", provide 1-3 short insights and suggested actions.
        Summary: ${statsSummary}

        Format exactly:
        INSIGHT_1: <short sentence>
        ACTION_1: <short sentence>
        (repeat up to 3 times)`
      }
    ],
    model: "llama-3.3-70b-versatile",
  });

  const text = completion.choices[0]?.message?.content || "";
  const insights: { insight: string; action: string }[] = [];
  
  const lines = text.split('\n');
  let currentInsight = "";
  for (const line of lines) {
    const insightMatch = line.match(/INSIGHT_\d+:\s*(.*)/i);
    const actionMatch = line.match(/ACTION_\d+:\s*(.*)/i);
    
    if (insightMatch) {
      currentInsight = insightMatch[1].trim();
    } else if (actionMatch && currentInsight) {
      insights.push({ insight: currentInsight, action: actionMatch[1].trim() });
      currentInsight = "";
    }
  }

  return insights;
}

export async function generateSpeech(text: string, style: 'firm' | 'calm' = 'firm') {
  const prompt = style === 'calm' 
    ? `Speak this very slowly, calmly, and meditatively. Use a deep, soothing tone with long pauses: ${text}`
    : `Speak this firmly and clearly: ${text}`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: style === 'calm' ? 'Zephyr' : 'Charon' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  return base64Audio;
}

let globalAudioContext: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;

/**
 * Plays raw PCM audio data from Gemini TTS
 * @param base64Data The base64 encoded PCM data
 * @param sampleRate The sample rate (default 24000 for Gemini TTS)
 */
export async function playRawAudio(base64Data: string, sampleRate: number = 24000) {
  try {
    if (!globalAudioContext) {
      globalAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate });
    }
    
    if (globalAudioContext.state === 'suspended') {
      await globalAudioContext.resume();
    }

    // Stop previous audio if any
    if (currentSource) {
      try {
        currentSource.stop();
      } catch (e) {
        // Ignore errors if already stopped
      }
    }
    
    // Decode base64 to ArrayBuffer
    const binaryString = atob(base64Data);
    const len = binaryString.length;
    // Ensure even length for Int16Array
    const bufferLen = len % 2 === 0 ? len : len - 1;
    const bytes = new Uint8Array(bufferLen);
    for (let i = 0; i < bufferLen; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Gemini TTS returns 16-bit Linear PCM
    const int16Array = new Int16Array(bytes.buffer);
    const float32Array = new Float32Array(int16Array.length);
    
    // Normalize to [-1, 1] and apply a slight boost if needed
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768;
    }

    const audioBuffer = globalAudioContext.createBuffer(1, float32Array.length, sampleRate);
    audioBuffer.getChannelData(0).set(float32Array);

    const source = globalAudioContext.createBufferSource();
    const gainNode = globalAudioContext.createGain();
    
    source.buffer = audioBuffer;
    // Boost volume slightly for clarity (1.2x)
    gainNode.gain.value = 1.2;
    
    source.connect(gainNode);
    gainNode.connect(globalAudioContext.destination);
    currentSource = source;
    
    return new Promise((resolve) => {
      source.onended = () => {
        if (currentSource === source) currentSource = null;
        resolve(true);
      };
      source.start(0);
    });
  } catch (error) {
    console.error("Error playing raw audio:", error);
    throw error;
  }
}

/**
 * Converts raw PCM data to a WAV Blob URL
 */
export function pcmToWav(base64Data: string, sampleRate: number = 24000): string {
  const binaryString = atob(base64Data);
  const len = binaryString.length;
  const bufferLen = len % 2 === 0 ? len : len - 1;
  const bytes = new Uint8Array(bufferLen);
  for (let i = 0; i < bufferLen; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);
  
  // RIFF identifier
  view.setUint32(0, 0x52494646, false); // "RIFF"
  // file length
  view.setUint32(4, 36 + bufferLen, true);
  // RIFF type
  view.setUint32(8, 0x57415645, false); // "WAVE"
  // format chunk identifier
  view.setUint32(12, 0x666d7420, false); // "fmt "
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (1 is PCM)
  view.setUint16(20, 1, true);
  // channel count
  view.setUint16(22, 1, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * 2, true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, 2, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // data chunk identifier
  view.setUint32(36, 0x64617461, false); // "data"
  // data chunk length
  view.setUint32(40, bufferLen, true);
  
  const blob = new Blob([wavHeader, bytes], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

export function stopAudio() {
  if (currentSource) {
    try {
      currentSource.stop();
      currentSource = null;
    } catch (e) {
      // Ignore
    }
  }
}
