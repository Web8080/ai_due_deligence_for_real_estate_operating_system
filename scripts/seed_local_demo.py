# Author: Victor.I
from backend.app.auth import create_default_admin
from backend.app.database import SessionLocal
from backend.app.main import _backfill_demo_dataset, _ensure_workflow_records, _seed_demo_records


def main() -> None:
    db = SessionLocal()
    try:
        create_default_admin(db)
        base = _seed_demo_records(db)
        _ensure_workflow_records(db)
        added = _backfill_demo_dataset(db)
        print(
            "Seeded local demo: "
            f"deals={base.deals_created}, contacts={base.contacts_created}, "
            f"investor_pipeline={base.investor_pipeline_entries_created}; "
            f"backfill tasks={added['workflow_tasks_added']}, exceptions={added['workflow_exceptions_added']}, "
            f"notes={added['deal_notes_added']}, docs={added['documents_added']}, "
            f"ai_logs={added['ai_query_logs_added']}, ai_runs={added['ai_runs_added']}, "
            f"audit={added['audit_events_added']}, chunks={added['chunks_added']}. "
            "Users: backend/app/auth.py DEFAULT_USERS."
        )
    finally:
        db.close()


if __name__ == "__main__":
    main()
