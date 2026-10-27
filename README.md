# Voz Nota

App de voz a texto para web, Android y escritorio. Las transcripciones se guardan en el almacenamiento local del dispositivo.

## Compartir la app con otras personas

Las personas que solo quieran usar la app **no necesitan descargar la carpeta ni ejecutar comandos**. Después de publicar el proyecto, solo tendrán que abrir el enlace HTTPS que genere GitHub Pages y permitir el acceso al micrófono.

### Publicar gratis con GitHub Pages

1. Sube este proyecto a un repositorio de GitHub. Puedes hacerlo desde la interfaz web de GitHub o desde el panel **Control de código fuente** de VS Code; los usuarios de la app no tienen que hacer esto.
2. En el repositorio, abre **Settings → Pages** y elige **GitHub Actions** como origen de publicación.
3. En **Actions**, ejecuta **Publish Voz Nota** con **Run workflow**, o publica los cambios en la rama `main` o `master`. La publicación se hará automáticamente.
4. Cuando la ejecución termine correctamente, comparte la dirección HTTPS del sitio. Normalmente tendrá el formato `https://USUARIO.github.io/REPOSITORIO/`.

El enlace público solo estará disponible después de conectar y subir este proyecto a un repositorio de GitHub y completar la primera publicación. No abras ni compartas `localhost`: solo funciona en la computadora que ejecuta el servidor.

## Probar la app en tu computadora

La prueba local es opcional; **no hace falta para publicar el sitio ni para que las personas lo usen**. Si quieres usarla, abre una terminal en la carpeta del proyecto e inicia un servidor:

```sh
npx http-server . -p 8000
```

Abre <http://localhost:8000> en Chrome o Edge y permite el micrófono cuando el navegador lo solicite. El aviso «No segura» es normal en el servidor local; para compartirla con otras personas, usa el enlace HTTPS de GitHub Pages.

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
