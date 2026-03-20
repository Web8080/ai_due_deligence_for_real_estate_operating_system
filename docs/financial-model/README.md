# Financial model (spreadsheet)

**Author:** Victor.I

| File | Purpose |
|------|---------|
| `reos_financial_model.xlsx` | Assumptions, 36-month P&amp;L, annual rollup, runway summary |
| `assumptions.md` | Narrative behind each driver and what the model excludes |

Generate or refresh the workbook:

```bash
cd /path/to/repo
python scripts/build_financial_model.py
```

Requires `openpyxl` (listed in `backend/requirements.txt`).
