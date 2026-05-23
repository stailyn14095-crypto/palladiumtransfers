# 1. Update views/ReservasView.tsx toggle switch default
path_reservas = r"j:\PALLADIUM TRANSFERS\palladium-operations-hub\views\ReservasView.tsx"
with open(path_reservas, 'r', encoding='utf-8') as f:
    lines = f.readlines()

updated_res = False
for idx, line in enumerate(lines):
    if "const envSetting = settings?.find((s: any) => s.key === 'fomento_env');" in line:
        # Check if next line contains isProd
        if idx + 1 < len(lines) and "isProd = envSetting ? envSetting.value === 'production' : false;" in lines[idx+1]:
            # Replace it to default to true (Production by default if not set or not 'test')
            lines[idx+1] = lines[idx+1].replace(
                "isProd = envSetting ? envSetting.value === 'production' : false;",
                "isProd = envSetting ? envSetting.value !== 'test' : true;"
            )
            updated_res = True
            print("Successfully updated Toggle Switch in ReservasView.tsx!")
            break

if updated_res:
    with open(path_reservas, 'w', encoding='utf-8') as f:
        f.writelines(lines)
else:
    print("Could not update Toggle Switch in ReservasView.tsx")


# 2. Update views/DriverAppView.tsx default environment
path_driver = r"j:\PALLADIUM TRANSFERS\palladium-operations-hub\views\DriverAppView.tsx"
with open(path_driver, 'r', encoding='utf-8') as f:
    d_lines = f.readlines()

updated_d = False
for idx, line in enumerate(d_lines):
    if "const fomentoEnvSetting = settings?.find((s: any) => s.key === 'fomento_env');" in line:
        # Check if next line contains isTestMode
        if idx + 1 < len(d_lines) and "const isTestMode = fomentoEnvSetting ? fomentoEnvSetting.value !== 'production' : true;" in d_lines[idx+1]:
            d_lines[idx+1] = d_lines[idx+1].replace(
                "const isTestMode = fomentoEnvSetting ? fomentoEnvSetting.value !== 'production' : true;",
                "const isTestMode = fomentoEnvSetting ? fomentoEnvSetting.value === 'test' : false;"
            )
            updated_d = True
            print("Successfully updated isTestMode default in DriverAppView.tsx!")
            break

if updated_d:
    with open(path_driver, 'w', encoding='utf-8') as f:
        f.writelines(d_lines)
else:
    print("Could not update isTestMode default in DriverAppView.tsx")
