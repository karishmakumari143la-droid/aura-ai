"""
AURA AI — Real Voice Engine
Processes multilingual speech (Hindi, English, Hinglish), coordinates TTS synthesis,
pauses recognition during TTS to prevent audio loops, and recovers from silence with zero false errors.
"""

import time
from typing import Dict, Any, Optional
from ..intent import IntentAnalyzer, DetectedLanguage

class VoiceService:
    def __init__(self):
        self.is_tts_active = False
        self.last_speech_time = time.time()

    def pause_listening_for_tts(self):
        """Pauses speech recognition while AURA is speaking through TTS."""
        self.is_tts_active = True

    def resume_listening_after_tts(self):
        """Resumes microphone listening when TTS finishes playing."""
        self.is_tts_active = False
        self.last_speech_time = time.time()

    def process_voice_transcript(self, transcript: str) -> Dict[str, Any]:
        """
        Validates voice input.
        If transcript is empty, silence, or noise, recovers normally with zero error.
        """
        clean_text = transcript.strip() if transcript else ""

        # Check for silence or interim no-speech
        if not clean_text or clean_text.lower() in ["[silence]", "[noise]", "...", ""]:
            return {
                "success": True,
                "is_empty": True,
                "text": "",
                "message": "Normal silence detected; ready for next user utterance.",
                "error": None
            }

        # Ignore interim input if TTS is actively playing to prevent self-triggering
        if self.is_tts_active:
            return {
                "success": True,
                "is_empty": True,
                "text": "",
                "ignored_reason": "TTS playback active (preventing acoustic loop)",
                "error": None
            }

        detected_lang = IntentAnalyzer.detect_language(clean_text)
        analysis = IntentAnalyzer.analyze_intent(clean_text)

        return {
            "success": True,
            "is_empty": False,
            "text": clean_text,
            "language": detected_lang.value,
            "intent": analysis.get("intent"),
            "requires_execution": analysis.get("requires_execution")
        }

    def prepare_tts_payload(self, text: str, language: Optional[str] = None) -> Dict[str, Any]:
        """
        Generates TTS synthesis configuration matching the spoken dialect.
        """
        lang = language or IntentAnalyzer.detect_language(text).value
        voice_map = {
            "hindi": {"lang_code": "hi-IN", "pitch": 1.0, "rate": 0.95},
            "hinglish": {"lang_code": "en-IN", "pitch": 1.0, "rate": 1.0},
            "english": {"lang_code": "en-US", "pitch": 1.0, "rate": 1.0}
        }
        cfg = voice_map.get(lang, voice_map["english"])
        return {
            "text": text,
            "language_code": cfg["lang_code"],
            "pitch": cfg["pitch"],
            "rate": cfg["rate"],
            "pause_recognition": True
        }
