import csv
import sys
import logging

input_file = '/Users/macbookair/Downloads/articles-export-2026-07-16_14-55-30.csv'
output_file = '/Users/macbookair/Downloads/articles_fixed.csv'

try:
    with open(input_file, 'r', encoding='utf-8-sig') as infile:
        # We use a custom parser approach if csv module fails, but let's try csv module first
        # Sometimes unescaped quotes break the csv parser, so we can try setting strict=False
        reader = csv.reader(infile, delimiter=';')
        rows = list(reader)
        
    with open(output_file, 'w', encoding='utf-8', newline='') as outfile:
        writer = csv.writer(outfile, delimiter=',', quoting=csv.QUOTE_MINIMAL)
        writer.writerows(rows)
    print(f"SUCCESS: Wrote {len(rows)} rows to {output_file}")
except Exception as e:
    print(f"ERROR: {e}")
    # Fallback to manual split if csv parser fails due to quotes
    try:
        with open(input_file, 'r', encoding='utf-8-sig') as infile:
            content = infile.read()
            # Simple approach is not possible due to newlines in content, so we let the error show first.
    except Exception as e2:
        pass
