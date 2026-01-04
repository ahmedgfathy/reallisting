
import re
import sys

sql_file = r'c:\Users\ahmed\Downloads\reallisting\scripts\backup\backup_1767489617809.sql'

tables = {}
current_table = None
line_count = 0

with open(sql_file, 'r', encoding='utf-8', errors='ignore') as f:
    for line in f:
        line_count += 1
        create_match = re.match(r'CREATE TABLE (\w+) \(', line, re.IGNORECASE)
        if create_match:
            current_table = create_match.group(1)
            print(f"Found table: {current_table} at line {line_count}", file=sys.stderr)
            tables[current_table] = [line.strip()]
            continue
        
        if current_table:
            tables[current_table].append(line.strip())
            if ');' in line:
                current_table = None

print(f"Finished processing {line_count} lines.", file=sys.stderr)

for table, schema in tables.items():
    print(f"--- Table: {table} ---")
    print("\n".join(schema))
    print("\n")
