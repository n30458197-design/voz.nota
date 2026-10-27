# Voz Nota

App de voz a texto para web, Android y escritorio. Las transcripciones se guardan en el almacenamiento local del dispositivo.

## Usar la app en el navegador

No abras `index.html` directamente como archivo (`file:///...`): los navegadores pueden bloquear el acceso al micrófono. Desde la carpeta del proyecto, inicia un servidor local:

```sh
npx http-server . -p 8000
```

Después abre <http://localhost:8000> en Chrome o Edge y permite el uso del micrófono cuando el navegador lo solicite. Si ya lo bloqueaste, abre los permisos del sitio desde el icono que aparece junto a la dirección web y habilita el micrófono; luego recarga la página.

El servidor local solo permite acceder a la app desde tu propia computadora. Para compartirla con otras personas, publícala en un servicio de alojamiento web con HTTPS y comparte la dirección pública. `localhost` no es un enlace público.

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
