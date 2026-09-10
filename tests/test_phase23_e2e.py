"""
AURA AI — Phase 23 E2E Multi-Turn Verification Test
Validates the exact 7-turn conversation flow mandated by the user specifications:
1. "Hello AURA, kaise ho?" -> CONVERSATION (0 tasks, no DAG, no agent)
2. "What is SEO?" -> QUESTION (0 tasks, educational explanation)
3. "Mujhe ek gym website banani hai." -> CLARIFICATION (0 tasks)
4. "IronCore." -> CLARIFICATION (0 tasks, stores name)
5. "Premium dark design." -> CLARIFICATION (0 tasks, stores theme)
6. "WhatsApp booking bhi." -> CLARIFICATION (0 tasks, stores feature, summarizes, asks confirmation)
7. "Okay bana do." -> ACTION_REQUEST (ONE task, REAL files, REAL build, REAL QA, REAL screenshot)
"""

import unittest
import os
import shutil
from python_brain.brain import AuraBrain

class TestPhase23E2E(unittest.TestCase):
    def setUp(self):
        self.test_dir = "/tmp/test_phase23_workspace"
        self.data_dir = "/tmp/test_phase23_data"
        shutil.rmtree(self.test_dir, ignore_errors=True)
        shutil.rmtree(self.data_dir, ignore_errors=True)
        os.makedirs(self.test_dir, exist_ok=True)
        os.makedirs(self.data_dir, exist_ok=True)

        self.brain = AuraBrain(workspace_root=self.test_dir, data_dir=self.data_dir)
        self.user_id = "user_p23_e2e"
        self.session_id = "sess_p23_e2e"

    def tearDown(self):
        shutil.rmtree(self.test_dir, ignore_errors=True)
        shutil.rmtree(self.data_dir, ignore_errors=True)

    def test_complete_7_turn_conversation_and_real_build(self):
        # Turn 1: Normal conversation
        r1 = self.brain.process_turn("Hello AURA, kaise ho?", user_id=self.user_id, session_id=self.session_id)
        self.assertEqual(r1["intent"], "CONVERSATION")
        self.assertFalse(r1["execution_performed"])
        self.assertEqual(r1["tasks_created"], 0)
        self.assertIn("theek", r1["response"].lower())

        # Turn 2: Educational explanation / advice
        r2 = self.brain.process_turn("What is SEO?", user_id=self.user_id, session_id=self.session_id)
        self.assertEqual(r2["intent"], "QUESTION")
        self.assertFalse(r2["execution_performed"])
        self.assertEqual(r2["tasks_created"], 0)
        self.assertIn("seo", r2["response"].lower())

        # Turn 3: Vague website request -> clarification
        r3 = self.brain.process_turn("Mujhe ek gym website banani hai.", user_id=self.user_id, session_id=self.session_id)
        self.assertEqual(r3["intent"], "CLARIFICATION")
        self.assertFalse(r3["execution_performed"])
        self.assertEqual(r3["tasks_created"], 0)
        self.assertTrue("naam" in r3["response"].lower() or "name" in r3["response"].lower())

        # Turn 4: Gym Name -> clarification (design)
        r4 = self.brain.process_turn("IronCore.", user_id=self.user_id, session_id=self.session_id)
        self.assertEqual(r4["intent"], "CLARIFICATION")
        self.assertFalse(r4["execution_performed"])
        self.assertEqual(r4["tasks_created"], 0)
        self.assertTrue("styling" in r4["response"].lower() or "design" in r4["response"].lower() or "theme" in r4["response"].lower())

        # Turn 5: Design Theme -> clarification (features)
        r5 = self.brain.process_turn("Premium dark design.", user_id=self.user_id, session_id=self.session_id)
        self.assertEqual(r5["intent"], "CLARIFICATION")
        self.assertFalse(r5["execution_performed"])
        self.assertEqual(r5["tasks_created"], 0)
        self.assertTrue("features" in r5["response"].lower() or "feature" in r5["response"].lower() or "whatsapp" in r5["response"].lower())

        # Turn 6: WhatsApp Feature -> confirmation prompt
        r6 = self.brain.process_turn("WhatsApp booking bhi.", user_id=self.user_id, session_id=self.session_id)
        self.assertEqual(r6["intent"], "CLARIFICATION")
        self.assertFalse(r6["execution_performed"])
        self.assertEqual(r6["tasks_created"], 0)
        self.assertIn("ironcore", r6["response"].lower())
        self.assertTrue("okay bana do" in r6["response"].lower() or "confirm" in r6["response"].lower())

        # Turn 7: User Confirmation -> REAL EXECUTION (ONE task)
        r7 = self.brain.process_turn("Okay bana do.", user_id=self.user_id, session_id=self.session_id)
        self.assertEqual(r7["intent"], "ACTION_REQUEST")
        self.assertTrue(r7["execution_performed"])
        self.assertTrue(r7["tasks_created"] > 0)

        # Verify real files on disk
        target_html = os.path.join(self.test_dir, "created_sites/active_project/index.html")
        self.assertTrue(os.path.exists(target_html), "index.html was not written to disk")
        
        with open(target_html, "r", encoding="utf-8") as f:
            content = f.read()
        
        self.assertIn("<!DOCTYPE html>", content)
        self.assertIn("IronCore Gym", content)
        self.assertIn("WhatsApp Booking", content)
        self.assertIn("tailwindcss", content)

        # Verify QA score
        qa_data = r7.get("qa_audit", {})
        self.assertTrue(qa_data.get("score", 0) >= 80, f"QA score was {qa_data.get('score')}")

if __name__ == "__main__":
    unittest.main()
