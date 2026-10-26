# Voz Nota

App de voz a texto para web, Android y escritorio. Las transcripciones se guardan en el almacenamiento local del dispositivo.

## Crear instaladores

Instala Node.js 20 o posterior y las dependencias del proyecto:

```sh
npm ci
```

Los instaladores se generan dentro de `release/`:

| Plataforma | Requisitos | Comando | Archivo |
| --- | --- | --- | --- |
| Windows | Windows x64 | `npm run desktop:win` | Instalador `.exe` |
| Android | JDK 21 y Android SDK (API 35) | `npm run android:add` y después `cd android && gradlew.bat assembleDebug` | `android/app/build/outputs/apk/debug/app-debug.apk` |
| macOS | macOS | `npm run desktop:mac` | Imagen `.dmg` |
| Linux | Linux x64 | `npm run desktop:linux` | Imagen `.AppImage` |

Windows no puede compilar directamente el `.dmg` de macOS ni el `.AppImage` de Linux. El flujo de GitHub Actions definido en `.github/workflows/build-installers.yml` compila los cuatro formatos en sus sistemas operativos correspondientes y publica cada instalador como artefacto descargable de la ejecución.

El dictado del APK usa el servicio de reconocimiento de voz instalado en Android y requiere permiso para el micrófono.
