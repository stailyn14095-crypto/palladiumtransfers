
import os
import re

def fix_jsx_arrows():
    files = [
        r"j:\PALLADIUM TRANSFERS\palladium-operations-hub\views\ReservasView.tsx",
        r"j:\PALLADIUM TRANSFERS\palladium-operations-hub\views\DispatchConsole.tsx"
    ]
    
    for path in files:
        if not os.path.exists(path):
            print(f"File not found: {path}")
            continue
            
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Replace -> followed by space and { with {"-> "}
        # Example: <span>-> {b.destination}</span>
        # Also handle {b.origin} -> {b.destination}
        
        # Pattern 1: >-> {
        new_content = content.replace(">-> {", '>{"-> "} {')
        
        # Pattern 2: } -> {
        new_content = new_content.replace("} -> {", '} {"->"} {')
        
        if new_content != content:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Fixed arrows in {path}")
        else:
            print(f"No arrows found to fix in {path}")

fix_jsx_arrows()
