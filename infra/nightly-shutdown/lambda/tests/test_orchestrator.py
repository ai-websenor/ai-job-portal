"""Behavior tests for ScheduleOrchestrator."""

from orchestrator import ScheduleOrchestrator


class _RecordingController:
    def __init__(self, name: str, log: list) -> None:
        self._name = name
        self._log = log

    def shutdown(self, env: str) -> None:
        self._log.append((self._name, "shutdown", env))

    def startup(self, env: str) -> None:
        self._log.append((self._name, "startup", env))


def test_shutdown_runs_controllers_in_registered_order():
    log: list = []
    orch = ScheduleOrchestrator(
        controllers=[
            _RecordingController("ecs", log),
            _RecordingController("rds", log),
            _RecordingController("valkey", log),
        ]
    )

    orch.shutdown(env="dev")

    assert [entry[0] for entry in log] == ["ecs", "rds", "valkey"]
    assert all(entry[1] == "shutdown" for entry in log)


def test_startup_runs_controllers_in_REVERSE_order():
    # Startup reverses so dependencies (RDS, Valkey) come up before ECS tasks
    # that connect to them.
    log: list = []
    orch = ScheduleOrchestrator(
        controllers=[
            _RecordingController("ecs", log),
            _RecordingController("rds", log),
            _RecordingController("valkey", log),
        ]
    )

    orch.startup(env="dev")

    assert [entry[0] for entry in log] == ["valkey", "rds", "ecs"]
    assert all(entry[1] == "startup" for entry in log)


def test_one_controller_failure_does_not_stop_remaining_shutdowns():
    # On shutdown we want to attempt all cost-cutting steps even if one fails
    # — leaving RDS running is cheaper than re-entering after a Valkey error.
    log: list = []

    class Boom:
        def shutdown(self, env):
            log.append(("boom", "shutdown", env))
            raise RuntimeError("intentional")

        def startup(self, env):
            pass

    orch = ScheduleOrchestrator(
        controllers=[
            _RecordingController("ecs", log),
            Boom(),
            _RecordingController("valkey", log),
        ]
    )

    errors = orch.shutdown(env="dev")

    assert [entry[0] for entry in log] == ["ecs", "boom", "valkey"]
    assert len(errors) == 1
