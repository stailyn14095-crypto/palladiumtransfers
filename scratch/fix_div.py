import re

path = r"j:\PALLADIUM TRANSFERS\palladium-operations-hub\views\ReservasView.tsx"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Let's inspect the lines around line 1635-1645
lines = content.splitlines()
print(f"Total lines: {len(lines)}")

# We look for:
#                                                                 })()}
#                                                                </div>
#
#                                                                <div className="flex gap-2 mt-2">

found = False
for idx, line in enumerate(lines):
    if "})()" in line and idx + 1 < len(lines) and "</div>" in lines[idx+1] and idx + 3 < len(lines) and "flex gap-2" in lines[idx+3]:
        print(f"Found target pattern at line {idx+1}:")
        print(f"  {idx}: {lines[idx]}")
        print(f"  {idx+1}: {lines[idx+1]}")
        print(f"  {idx+2}: {lines[idx+2]}")
        print(f"  {idx+3}: {lines[idx+3]}")
        
        # Remove lines[idx+1] (which is the extra </div>)
        del lines[idx+1]
        found = True
        break

if found:
    with open(path, 'w', encoding='utf-8') as f:
        f.write("\n".join(lines) + "\n")
    print("Successfully removed the extra </div>!")
else:
    print("Could not find the target pattern!")
