# Author: Victor.I
from backend.app.auth import create_default_admin
from backend.app.database import SessionLocal
from backend.app.main import _seed_demo_records


def main() -> None:
    db = SessionLocal()
    try:
        create_default_admin(db)
        result = _seed_demo_records(db)
        print(
            f"Seeded local demo data: deals={result.deals_created}, "
            f"contacts={result.contacts_created}, investor_pipeline={result.investor_pipeline_entries_created}"
        )
    finally:
        db.close()


if __name__ == "__main__":
    main()
