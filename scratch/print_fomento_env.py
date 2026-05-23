path = r"j:\PALLADIUM TRANSFERS\palladium-operations-hub\views\ReservasView.tsx"
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if "fomento_env" in line:
        print(f"Line {idx+1}:")
        start = max(0, idx - 2)
        end = min(len(lines), idx + 3)
        for i in range(start, end):
            print(f"  {i+1}: {repr(lines[i])}")
