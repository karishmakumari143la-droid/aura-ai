"""
AURA AI — Voice E2E Verification

Validates the real Python VoiceService contract:
1. Normal Hinglish transcript is accepted.
2. Hindi transcript is accepted and language is detected.
3. English question remains conversational/question-like and requires no execution.
4. Action transcript is classified as requiring execution.
5. Empty/silence input recovers without an error.
6. TTS payload uses the detected language and pauses recognition.
"""

import unittest

from python_brain.voice.service import VoiceService


class TestVoiceE2E(unittest.TestCase):
    def setUp(self):
        self.voice = VoiceService()

    def test_hinglish_voice_transcript(self):
        result = self.voice.process_voice_transcript(
            "AURA meri website ka status batao"
        )

        self.assertTrue(result["success"])
        self.assertFalse(result["is_empty"])
        self.assertEqual(result["text"], "AURA meri website ka status batao")
        self.assertIn(result["language"], {"hinglish", "hindi", "english"})
        self.assertIn("intent", result)
        self.assertIn("requires_execution", result)

    def test_hindi_voice_transcript(self):
        result = self.voice.process_voice_transcript(
            "ऑरा मेरी वेबसाइट का स्टेटस बताओ"
        )

        self.assertTrue(result["success"])
        self.assertFalse(result["is_empty"])
        self.assertEqual(result["text"], "ऑरा मेरी वेबसाइट का स्टेटस बताओ")
        self.assertEqual(result["language"], "hindi")

    def test_english_question_does_not_require_execution(self):
        result = self.voice.process_voice_transcript(
            "What is SEO?"
        )

        self.assertTrue(result["success"])
        self.assertFalse(result["is_empty"])
        self.assertEqual(result["language"], "english")
        self.assertFalse(result["requires_execution"])

    def test_action_voice_transcript_requires_execution(self):
        result = self.voice.process_voice_transcript(
            "meri website ke liye ek index.html file banao"
        )

        self.assertTrue(result["success"])
        self.assertFalse(result["is_empty"])
        self.assertTrue(result["requires_execution"])

    def test_silence_recovers_without_error(self):
        for transcript in ["", " ", "[silence]", "[noise]", "..."]:
            result = self.voice.process_voice_transcript(transcript)

            self.assertTrue(result["success"])
            self.assertTrue(result["is_empty"])
            self.assertEqual(result["text"], "")
            self.assertIsNone(result["error"])

    def test_tts_payload_hindi(self):
        result = self.voice.prepare_tts_payload(
            "नमस्ते, मैं AURA हूँ।",
            language="hindi",
        )

        self.assertEqual(result["language_code"], "hi-IN")
        self.assertEqual(result["pitch"], 1.0)
        self.assertEqual(result["rate"], 0.95)
        self.assertTrue(result["pause_recognition"])
        self.assertEqual(result["text"], "नमस्ते, मैं AURA हूँ।")

    def test_tts_payload_hinglish(self):
        result = self.voice.prepare_tts_payload(
            "Hi, main AURA hoon.",
            language="hinglish",
        )

        self.assertEqual(result["language_code"], "en-IN")
        self.assertTrue(result["pause_recognition"])

    def test_tts_payload_english(self):
        result = self.voice.prepare_tts_payload(
            "Hello, I am AURA.",
            language="english",
        )

        self.assertEqual(result["language_code"], "en-US")
        self.assertTrue(result["pause_recognition"])


if __name__ == "__main__":
    unittest.main()
