"""
AURA AI — Voice API Integration E2E

Validates the real FastAPI /api/brain/voice integration:
Voice transcript -> VoiceService -> AURA Brain -> TTS payload.
"""

import unittest

from fastapi.testclient import TestClient

from python_brain.main import app


class TestVoiceAPIIntegrationE2E(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_english_question_voice_flow(self):
        response = self.client.post(
            "/api/brain/voice",
            json={
                "transcript": "What is SEO?",
                "user_id": "voice_api_e2e_user_english",
            },
        )

        self.assertEqual(response.status_code, 200)

        data = response.json()

        self.assertIn("voice", data)
        self.assertIn("brain", data)
        self.assertIn("tts", data)

        self.assertTrue(data["voice"]["success"])
        self.assertFalse(data["voice"]["is_empty"])
        self.assertEqual(data["voice"]["language"], "english")

        self.assertEqual(data["brain"]["intent"], "QUESTION")
        self.assertEqual(data["brain"]["tasks_created"], 0)
        self.assertFalse(data["brain"]["execution_performed"])

        self.assertEqual(data["tts"]["language_code"], "en-US")
        self.assertTrue(data["tts"]["pause_recognition"])
        self.assertTrue(data["tts"]["text"])

    def test_hinglish_conversation_voice_flow(self):
        response = self.client.post(
            "/api/brain/voice",
            json={
                "transcript": "Hello AURA kaise ho?",
                "user_id": "voice_api_e2e_user_hinglish",
            },
        )

        self.assertEqual(response.status_code, 200)

        data = response.json()

        self.assertTrue(data["voice"]["success"])
        self.assertFalse(data["voice"]["is_empty"])

        self.assertEqual(data["brain"]["intent"], "CONVERSATION")
        self.assertEqual(data["brain"]["tasks_created"], 0)
        self.assertFalse(data["brain"]["execution_performed"])

        self.assertIn(
            data["tts"]["language_code"],
            {"en-IN", "en-US"},
        )
        self.assertTrue(data["tts"]["pause_recognition"])

    def test_hindi_voice_flow(self):
        response = self.client.post(
            "/api/brain/voice",
            json={
                "transcript": "ऑरा आप कैसे हो?",
                "user_id": "voice_api_e2e_user_hindi",
            },
        )

        self.assertEqual(response.status_code, 200)

        data = response.json()

        self.assertTrue(data["voice"]["success"])
        self.assertEqual(data["voice"]["language"], "hindi")
        self.assertIn(
            data["brain"]["intent"],
            {"CONVERSATION", "QUESTION"},
        )
        self.assertEqual(data["brain"]["tasks_created"], 0)

        self.assertEqual(data["tts"]["language_code"], "hi-IN")
        self.assertTrue(data["tts"]["pause_recognition"])

    def test_silence_does_not_call_brain(self):
        response = self.client.post(
            "/api/brain/voice",
            json={
                "transcript": "[silence]",
                "user_id": "voice_api_e2e_user_silence",
            },
        )

        self.assertEqual(response.status_code, 200)

        data = response.json()

        self.assertTrue(data["voice"]["success"])
        self.assertTrue(data["voice"]["is_empty"])
        self.assertIsNone(data["brain"])

        self.assertNotIn("tts", data)


if __name__ == "__main__":
    unittest.main()
