import os

def generate_project_output():
    # --- CONFIGURATION ---
    output_filename = "output.txt"
    
    # Folders to completely ignore
    blacklist_dirs = {
        '.git', '__pycache__', 'node_modules', 'venv', 'env', 
        '.idea', '.vscode', 'dist', 'build', "target", 'out', 'bin', 'obj',"logs","release_sure",".github"
    }
    
    # Files to completely ignore
    blacklist_files = {
        output_filename, 
        os.path.basename(__file__), # Ignored the script itself
        '.DS_Store', 'package-lock.json', 'yarn.lock'
    }
    
    # File extensions to ignore (binary files, images, etc.)
    blacklist_extensions = {
        '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', 
        '.pyc', '.exe', '.dll', '.so', '.bin', '.pdf'
    }
    # ---------------------

    root_path = os.getcwd()
    output_abs_path = os.path.join(root_path, output_filename)

    try:
        with open(output_abs_path, 'w', encoding='utf-8') as out_file:
            # Introduction text
            out_file.write(f"Presentation of file contents for project located at: {root_path}\n")
            out_file.write("=================================================================\n\n")

            # A: List files and paths (Walking the tree)
            for current_root, dirs, files in os.walk(root_path):
                # Filter directories in-place to stop os.walk from entering blacklisted folders
                dirs[:] = [d for d in dirs if d not in blacklist_dirs]

                for filename in files:
                    # Check file blacklist
                    if filename in blacklist_files:
                        continue

                    # Check extension blacklist
                    _, ext = os.path.splitext(filename)
                    if ext.lower() in blacklist_extensions:
                        continue

                    file_abs_path = os.path.join(current_root, filename)
                    file_rel_path = os.path.relpath(file_abs_path, root_path)
                    
                    # Clean extension for Markdown code block (remove dot)
                    code_block_lang = ext.lstrip('.') if ext else 'text'

                    # Read file content
                    try:
                        with open(file_abs_path, 'r', encoding='utf-8') as in_file:
                            content = in_file.read()
                        
                        # B: Print content with specific format
                        out_file.write(f"```{code_block_lang}\n")
                        out_file.write(f"// {file_rel_path}\n")
                        out_file.write(content)
                        # Ensure content ends with a newline before closing block
                        if not content.endswith('\n'):
                            out_file.write('\n')
                        out_file.write("```\n\n")

                        # Console Output as requested
                        print(f"The file {file_abs_path} is added to:\n {output_abs_path}")

                    except UnicodeDecodeError:
                        # Skip files that aren't text (if they slipped past extension filter)
                        print(f"Skipped binary/non-text file: {file_abs_path}")
                    except Exception as e:
                        print(f"Could not read {file_abs_path}: {e}")

        print(f"\nDone. Content written to {output_filename}")

    except IOError as e:
        print(f"Error creating output file: {e}")

if __name__ == "__main__":
    generate_project_output()