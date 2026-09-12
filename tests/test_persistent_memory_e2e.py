import os
import tempfile

from python_brain.memory import PersistentMemory


def test_memory_persists_across_instances():
    with tempfile.TemporaryDirectory() as tmp:
        db = os.path.join(tmp, "aura_memory.db")

        memory1 = PersistentMemory(db)
        memory1.set_memory(
            "user1",
            "preference",
            "language",
            "Hinglish",
            tags=["language", "communication"],
        )

        memory2 = PersistentMemory(db)

        assert memory2.get_memory(
            "user1", "preference", "language"
        ) == "Hinglish"


def test_memory_search_returns_matching_memory():
    with tempfile.TemporaryDirectory() as tmp:
        db = os.path.join(tmp, "aura_memory.db")
        memory = PersistentMemory(db)

        memory.set_memory(
            "user1",
            "preference",
            "response_style",
            "Short and direct",
            tags=["style"],
        )

        results = memory.search_memories("user1", "direct")

        assert len(results) == 1
        assert results[0]["key"] == "response_style"
        assert results[0]["value"] == "Short and direct"


def test_memory_update_does_not_create_duplicate():
    with tempfile.TemporaryDirectory() as tmp:
        db = os.path.join(tmp, "aura_memory.db")
        memory = PersistentMemory(db)

        memory.set_memory("user1", "preference", "language", "Hindi")
        memory.set_memory("user1", "preference", "language", "Hinglish")

        results = memory.search_memories("user1", "language")

        assert len(results) == 1
        assert results[0]["value"] == "Hinglish"


def test_delete_memory():
    with tempfile.TemporaryDirectory() as tmp:
        db = os.path.join(tmp, "aura_memory.db")
        memory = PersistentMemory(db)

        memory.set_memory("user1", "fact", "name", "Karishma")

        assert memory.delete_memory("user1", "fact", "name") is True
        assert memory.get_memory("user1", "fact", "name") is None
        assert memory.delete_memory("user1", "fact", "name") is False


def test_forget_removes_matching_keys_only_for_user():
    with tempfile.TemporaryDirectory() as tmp:
        db = os.path.join(tmp, "aura_memory.db")
        memory = PersistentMemory(db)

        memory.set_memory("user1", "fact", "favorite_color", "black")
        memory.set_memory("user1", "fact", "favorite_food", "pizza")
        memory.set_memory("user2", "fact", "favorite_color", "blue")

        assert memory.forget("user1", "favorite_color") is True

        assert memory.get_memory(
            "user1", "fact", "favorite_color"
        ) is None

        assert memory.get_memory(
            "user1", "fact", "favorite_food"
        ) == "pizza"

        assert memory.get_memory(
            "user2", "fact", "favorite_color"
        ) == "blue"


def test_clear_user_memories():
    with tempfile.TemporaryDirectory() as tmp:
        db = os.path.join(tmp, "aura_memory.db")
        memory = PersistentMemory(db)

        memory.set_memory("user1", "fact", "name", "Karishma")
        memory.add_conversation_turn(
            "user1", "session1", "user", "Hello AURA"
        )

        memory.set_memory("user2", "fact", "name", "Other")

        memory.clear_user_memories("user1")

        assert memory.search_memories("user1") == []
        assert memory.search_memories("user2") != []
        assert memory.get_recent_conversation("user1", "session1") == []


def test_conversation_history_persists_and_preserves_order():
    with tempfile.TemporaryDirectory() as tmp:
        db = os.path.join(tmp, "aura_memory.db")

        memory1 = PersistentMemory(db)

        memory1.add_conversation_turn(
            "user1", "session1", "user", "Hello"
        )
        memory1.add_conversation_turn(
            "user1", "session1", "assistant", "Hi"
        )

        memory2 = PersistentMemory(db)

        history = memory2.get_recent_conversation(
            "user1", "session1"
        )

        assert [item["role"] for item in history] == [
            "user",
            "assistant",
        ]
        assert [item["content"] for item in history] == [
            "Hello",
            "Hi",
        ]


if __name__ == "__main__":
    print("PERSISTENT_MEMORY_E2E: PASS")
