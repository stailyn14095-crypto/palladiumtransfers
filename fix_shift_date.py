import os

def fix_file(path):
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    
    new_content = content.replace("s.shift_date", "s.date")
    
    if content != new_content:
        with open(path, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"SUCCESS: {path}")
    else:
        print(f"NO CHANGES: {path}")

fix_file("j:/PALLADIUM TRANSFERS/palladium-operations-hub/views/ReservasView.tsx")
fix_file("j:/PALLADIUM TRANSFERS/palladium-operations-hub/views/DriverAppView.tsx")
