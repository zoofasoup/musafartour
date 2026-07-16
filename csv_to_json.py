import csv
import json

input_file = '/Users/macbookair/Downloads/articles_fixed.csv'
output_file = '/Users/macbookair/.gemini/antigravity/scratch/musafartour-lovable/src/data/articles_migration.json'

data = []
with open(input_file, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        data.append(row)

with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f"Written {len(data)} items to {output_file}")
