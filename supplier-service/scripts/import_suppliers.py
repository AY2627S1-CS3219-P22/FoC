"""Merge the campus CSV into the local Docker supplier database, preserving IDs."""
import argparse
import csv
from decimal import Decimal
import io
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[2]
COLUMNS = ['Name', 'Type', 'Building', 'Floor', 'Location Description', 'Latitude',
           'Longitude', 'StartingTime', 'ClosingTime', 'ImageURL']
CATEGORIES = {'food', 'food/coffee', 'printing', 'shopping', 'other'}


def import_sql(path):
    raw = path.read_bytes()
    try:
        text = raw.decode('utf-8-sig')
    except UnicodeDecodeError:
        text = raw.decode('cp1252')
    reader = csv.DictReader(io.StringIO(text))
    if reader.fieldnames != COLUMNS:
        raise ValueError('Unexpected CSV columns')
    rows = []
    names = set()
    for line, row in enumerate(reader, 2):
        values = [(row[column] or '').strip() for column in COLUMNS]
        values[1] = values[1].lower()
        if not values[0] or values[0] in names or not values[2] or values[1] not in CATEGORIES:
            raise ValueError(f'Invalid name, duplicate, building or category on line {line}')
        names.add(values[0])
        int(values[3])
        for index, limit in [(5, 90), (6, 180)]:
            number = Decimal(values[index])
            if not number.is_finite() or not -limit <= number <= limit:
                raise ValueError(f'Invalid coordinate on line {line}')
        for index in [7, 8, 9]:
            values[index] = values[index] or 'NA'
        rows.append('(' + ', '.join("'" + v.replace("'", "''") + "'" for v in values) + ')')
    if not rows:
        raise ValueError('CSV contains no suppliers')
    columns = ', '.join(f'"{column}"' for column in COLUMNS)
    updates = ', '.join(f'"{column}" = EXCLUDED."{column}"' for column in COLUMNS[1:])
    # Update only changed CSV-owned fields; preserve IDs, creation time, and
    # unrelated suppliers. The existing partial unique index identifies active names.
    previous = ', '.join(f'target."{c}"' for c in COLUMNS[1:])
    incoming = ', '.join(f'EXCLUDED."{c}"' for c in COLUMNS[1:])
    return ('BEGIN;\n'
            f'INSERT INTO public."Supplier_Database" AS target ({columns}) VALUES\n'
            + ',\n'.join(rows)
            + '\nON CONFLICT ("Name") WHERE deleted_at IS NULL DO UPDATE SET '
            + updates + ', updated_at = CURRENT_TIMESTAMP\n'
            + f'WHERE ROW({previous}) IS DISTINCT FROM ROW({incoming});\nCOMMIT;\n'), len(rows)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--csv', type=Path, default=ROOT / 'data/csv/supplier-seed-data.csv')
    parser.add_argument('--dry-run', action='store_true', help='Validate the CSV without writing to the database')
    args = parser.parse_args()
    sql, count = import_sql(args.csv)
    if args.dry_run:
        print(f'Validated {count} suppliers; no database changes.')
        return
    subprocess.run(['docker', 'compose', '-f', str(ROOT / 'supplier-service/compose.yaml'),
                    'exec', '-T', 'db', 'psql', '-U', 'postgres', '-d', 'postgres',
                    '-v', 'ON_ERROR_STOP=1'], input=sql, text=True, check=True)
    print(f'Merged {count} CSV suppliers. Existing active names retain their IDs; unrelated records are unchanged.')


if __name__ == '__main__':
    main()
