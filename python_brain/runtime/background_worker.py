#!/usr/bin/env python3
"""
AURA AI durable background worker.

Runs one persisted allowlisted task in an independent Python process.
The worker reconstructs the task exclusively from SQLite task_type + payload.
"""

import os
import sys

from .background import BackgroundTaskManager, DurableTaskDispatcher
from ..brain import AuraBrain


def main() -> int:
    if len(sys.argv) != 2:
        print("AURA background worker requires task_id", file=sys.stderr)
        return 2

    task_id = str(sys.argv[1]).strip()

    if not task_id:
        print("AURA background worker received empty task_id", file=sys.stderr)
        return 2

    data_dir = os.environ.get("AURA_DATA_DIR")
    workspace_root = os.environ.get("AURA_WORKSPACE_ROOT")
    task_db_path = os.environ.get("AURA_TASK_DB_PATH")

    brain = AuraBrain(
        workspace_root=workspace_root,
        data_dir=data_dir,
    )

    manager = BackgroundTaskManager(
        db_path=(
            task_db_path
            if task_db_path
            else os.path.join(
                brain.data_dir,
                "aura_tasks.db",
            )
        )
    )

    dispatcher = DurableTaskDispatcher(
        manager=manager,
        brain=brain,
    )

    success = dispatcher.dispatch_task(task_id)

    return 0 if success else 1


if __name__ == "__main__":
    raise SystemExit(main())
