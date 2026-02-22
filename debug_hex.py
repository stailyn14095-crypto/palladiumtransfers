
import os

files = [
    r"j:\PALLADIUM TRANSFERS\palladium-operations-hub\views\ReservasView.tsx",
    r"j:\PALLADIUM TRANSFERS\palladium-operations-hub\views\DispatchConsole.tsx"
]

def print_hex(file_path, start_line, end_line):
    print(f"\n--- {file_path} ---")
    with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
        lines = f.readlines()
        for i in range(start_line - 1, min(end_line, len(lines))):
            line = lines[i]
            print(f"Line {i+1}: {repr(line)}")
            print(f"Hex: {' '.join(hex(ord(c)) for c in line)}")

print_hex(files[0], 848, 862)
print_hex(files[1], 240, 250)
