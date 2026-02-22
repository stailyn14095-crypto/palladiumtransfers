
path = r"j:\PALLADIUM TRANSFERS\palladium-operations-hub\views\ReservasView.tsx"
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip_next = False
for i in range(len(lines)):
    if skip_next:
        skip_next = False
        continue
    
    # Identify the specific broken pattern
    if '</td>' in lines[i] and i + 1 < len(lines) and '</td>' in lines[i+1] and '<td>' not in lines[i]:
          # Check if it's the specific area around line 877
          if i > 850 and i < 900:
              new_lines.append(lines[i])
              skip_next = True
              print(f"Removed duplicate </td> at line {i+2}")
              continue
              
    new_lines.append(lines[i])

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
