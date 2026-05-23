import re

# File 1: views/ReservasView.tsx
reservas_path = r"j:\PALLADIUM TRANSFERS\palladium-operations-hub\views\ReservasView.tsx"
with open(reservas_path, 'r', encoding='utf-8') as f:
    reservas_content = f.read()

# Replace 1: handleComunicarFomento environment
old_comunicar = """         const fomentoEnvSetting = settings?.find((s: any) => s.key === 'fomento_env');
         const isTestMode = fomentoEnvSetting ? fomentoEnvSetting.value !== 'production' : true;"""

new_comunicar = """         const fomentoEnvSetting = settings?.find((s: any) => s.key === 'fomento_env');
         const isTestMode = fomentoEnvSetting ? fomentoEnvSetting.value === 'test' : false;"""

if old_comunicar in reservas_content:
    reservas_content = reservas_content.replace(old_comunicar, new_comunicar)
    print("Updated handleComunicarFomento default in ReservasView.tsx")
else:
    print("ERROR: Could not find handleComunicarFomento pattern in ReservasView.tsx")

# Replace 2: handleAnularFomento environment
old_anular = """          const fomentoEnvSetting = settings?.find((s: any) => s.key === 'fomento_env');
          const isTestMode = fomentoEnvSetting ? fomentoEnvSetting.value !== 'production' : true;"""

new_anular = """          const fomentoEnvSetting = settings?.find((s: any) => s.key === 'fomento_env');
          const isTestMode = fomentoEnvSetting ? fomentoEnvSetting.value === 'test' : false;"""

if old_anular in reservas_content:
    reservas_content = reservas_content.replace(old_anular, new_anular)
    print("Updated handleAnularFomento default in ReservasView.tsx")
else:
    print("ERROR: Could not find handleAnularFomento pattern in ReservasView.tsx")

# Replace 3: Toggle switch default
old_toggle = """                                                                    const envSetting = settings?.find((s: any) => s.key === 'fomento_env');
                                                                    const isProd = envSetting ? envSetting.value === 'production' : false;"""

new_toggle = """                                                                    const envSetting = settings?.find((s: any) => s.key === 'fomento_env');
                                                                    const isProd = envSetting ? envSetting.value !== 'test' : true;"""

if old_toggle in reservas_content:
    reservas_content = reservas_content.replace(old_toggle, new_toggle)
    print("Updated Toggle Switch default in ReservasView.tsx")
else:
    print("ERROR: Could not find Toggle Switch pattern in ReservasView.tsx")

with open(reservas_path, 'w', encoding='utf-8') as f:
    f.write(reservas_content)


# File 2: views/DriverAppView.tsx
driver_path = r"j:\PALLADIUM TRANSFERS\palladium-operations-hub\views\DriverAppView.tsx"
with open(driver_path, 'r', encoding='utf-8') as f:
    driver_content = f.read()

old_driver = """                const fomentoEnvSetting = settings?.find((s: any) => s.key === 'fomento_env');
                const isTestMode = fomentoEnvSetting ? fomentoEnvSetting.value !== 'production' : true;"""

new_driver = """                const fomentoEnvSetting = settings?.find((s: any) => s.key === 'fomento_env');
                const isTestMode = fomentoEnvSetting ? fomentoEnvSetting.value === 'test' : false;"""

if old_driver in driver_content:
    driver_content = driver_content.replace(old_driver, new_driver)
    print("Updated DriverAppView.tsx default")
else:
    print("ERROR: Could not find pattern in DriverAppView.tsx")

with open(driver_path, 'w', encoding='utf-8') as f:
    f.write(driver_content)
