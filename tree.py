#!/usr/bin/env python3
import os
import sys

# -----------------------------------------------------------------------------
# CONFIGURATION
# -----------------------------------------------------------------------------

# Folders to exclude from the tree to save performance/screen space
DIR_BLACKLIST = {
    '.git', 
    '.github', 
    '.vscode', 
    '__pycache__', 
    'node_modules', 
    'win-unpacked', 
    '.venv', 
    'target', 
    'build', 
    'dist'
}

# Files to exclude (optional, strictly exact match)
FILE_BLACKLIST = {
    'react.svg','electron.svg',"vite.svg"
}

# UTF-8 Box Drawing Characters
PIPE = "│   "
TEE  = "├── "
LAST = "└── "
SPACE= "    "

# -----------------------------------------------------------------------------
# LOGIC
# -----------------------------------------------------------------------------

def print_tree(directory_path, prefix=""):
    """
    Recursively prints the file structure of the given directory.
    """
    # Verify path exists
    if not os.path.exists(directory_path):
        print(f"Error: Directory '{directory_path}' not found.")
        return

    # Get list of files and directories
    try:
        entries = os.listdir(directory_path)
    except PermissionError:
        print(f"{prefix}[Access Denied]")
        return
    except OSError as e:
        print(f"{prefix}[Error: {e}]")
        return

    # Filter out blacklisted items
    filtered_entries = [
        e for e in entries 
        if e not in DIR_BLACKLIST and e not in FILE_BLACKLIST
    ]

    # Sort: Directories first, then files (Case insensitive)
    filtered_entries.sort(key=lambda x: (
        not os.path.isdir(os.path.join(directory_path, x)), 
        x.lower()
    ))

    total = len(filtered_entries)
    
    for i, entry in enumerate(filtered_entries):
        # Determine if this is the last item in the current branch
        is_last = (i == total - 1)
        
        path = os.path.join(directory_path, entry)
        is_dir = os.path.isdir(path)
        is_link = os.path.islink(path)
        
        # specific visual markers
        marker = LAST if is_last else TEE
        
        # Format the name (add trailing slash for dirs, arrows for symlinks)
        display_name = entry
        if is_link:
            try:
                target = os.readlink(path)
                display_name = f"{entry} -> {target}"
            except OSError:
                display_name = f"{entry} -> [unknown]"
        elif is_dir:
            display_name = f"{entry}/"

        # Print the current item
        print(f"{prefix}{marker}{display_name}")

        # Recurse if it is a directory and NOT a symlink 
        # (following symlinks can lead to infinite recursion)
        if is_dir and not is_link:
            # Prepare the prefix for the children
            extension = SPACE if is_last else PIPE
            print_tree(path, prefix + extension)

# -----------------------------------------------------------------------------
# ENTRY POINT
# -----------------------------------------------------------------------------

if __name__ == "__main__":
    # Use current working directory by default, or argument if provided
    root_dir = sys.argv[1] if len(sys.argv) > 1 else os.getcwd()
    
    root_name = os.path.basename(os.path.abspath(root_dir))
    if not root_name: root_name = root_dir # Handle root drive case

    print(f"\033[1m{root_name}/\033[0m") # Bold root name
    print_tree(root_dir)