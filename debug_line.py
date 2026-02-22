
import os

files = [
    r"j:\PALLADIUM TRANSFERS\palladium-operations-hub\views\ReservasView.tsx",
    r"j:\PALLADIUM TRANSFERS\palladium-operations-hub\views\DispatchConsole.tsx"
]

def debug_line(file_path, line_num):
    print(f"\n--- {file_path} Line {line_num} ---")
    with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
        lines = f.readlines()
        if line_num <= len(lines):
            line = lines[line_num - 1]
            print(f"Content: {repr(line)}")
            hex_vals = []
            for c in line:
                hex_vals.append(hex(ord(c)))
            print(f"Hex: {' '.join(hex_vals)}")

debug_line(files[0], 850) # ReservasView <select
debug_line(files[1], 243) # DispatchConsole <div className="overflow-hidden">
