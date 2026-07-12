import os

def replace_in_files(directory):
    changed_count = 0
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                filepath = os.path.join(root, file)
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                original = content
                
                # Replace standard padding patterns used for main containers
                content = content.replace('mx-auto px-4', 'mx-auto px-6 md:px-8')
                content = content.replace('w-full px-4', 'w-full px-6 md:px-8')
                
                # Special case if they had px-4 mx-auto
                content = content.replace('px-4 mx-auto', 'px-6 md:px-8 mx-auto')

                if content != original:
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(content)
                    changed_count += 1
                    print(f"Updated {filepath}")
    
    print(f"Updated {changed_count} files successfully.")

if __name__ == "__main__":
    replace_in_files('./src')
