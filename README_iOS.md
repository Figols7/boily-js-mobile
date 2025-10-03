# BoilyJS Mobile - iOS App Store Version

Esta es la versión móvil de BoilyJS desarrollada con Ionic + Angular + Capacitor para su publicación en Apple App Store.

## Requisitos previos

### Para desarrollo
- Node.js v18 o superior
- npm v9 o superior
- Ionic CLI (`npm install -g @ionic/cli`)
- Angular CLI (`npm install -g @angular/cli`)

### Para compilación iOS
- macOS (requerido para compilar apps iOS)
- Xcode 14 o superior
- CocoaPods (`sudo gem install cocoapods`)
- Apple Developer Account (para publicar en App Store)

## Instalación

```bash
# Instalar dependencias
npm install

# Construir el proyecto
npm run build

# Sincronizar con Capacitor
npx cap sync ios
```

## Desarrollo

### Servidor de desarrollo web
```bash
# Ejecutar en navegador
ionic serve

# Ejecutar con vista móvil
ionic serve --lab
```

### Ejecutar en iOS Simulator
```bash
# Construir y sincronizar
ionic build
npx cap sync ios

# Abrir en Xcode
npx cap open ios

# O ejecutar directamente
npx cap run ios
```

### Ejecutar en dispositivo físico iOS
1. Conectar el iPhone al Mac
2. Abrir el proyecto en Xcode: `npx cap open ios`
3. Seleccionar tu dispositivo en el menú de dispositivos
4. Configurar el Team de desarrollo en Signing & Capabilities
5. Ejecutar desde Xcode o usar: `npx cap run ios --target [device-id]`

## Estructura del proyecto

```
boily-js-mobile/
├── src/
│   ├── app/
│   │   ├── components/     # Componentes reutilizables
│   │   ├── guards/         # Guards de autenticación
│   │   ├── models/         # Interfaces y modelos
│   │   ├── pages/          # Páginas de la aplicación
│   │   ├── services/       # Servicios (API, Auth, etc.)
│   │   └── app.module.ts   # Módulo principal
│   ├── assets/             # Imágenes y recursos
│   ├── environments/       # Configuraciones por ambiente
│   └── theme/              # Estilos globales
├── ios/                    # Proyecto iOS nativo (generado)
├── capacitor.config.ts     # Configuración de Capacitor
└── package.json
```

## Características implementadas

- ✅ Autenticación (Login/Register)
- ✅ Integración con backend NestJS
- ✅ Almacenamiento seguro con Ionic Storage
- ✅ Navegación optimizada para móvil
- ✅ Componentes UI nativos de iOS
- ✅ Soporte para Face ID/Touch ID (próximamente)
- ✅ Push notifications (próximamente)

## Configuración para App Store

### 1. Configurar Bundle ID
En `capacitor.config.ts`:
```typescript
appId: 'com.tuempresa.boilyjs'  // Cambiar por tu Bundle ID
```

### 2. Configurar permisos en Info.plist
Ubicación: `ios/App/App/Info.plist`

Agregar según necesidades:
```xml
<key>NSCameraUsageDescription</key>
<string>La app necesita acceso a la cámara para...</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>La app necesita acceso a las fotos para...</string>
```

### 3. Configurar iconos y splash screens
```bash
# Instalar herramienta
npm install -g cordova-res

# Generar recursos (colocar icon.png y splash.png en resources/)
cordova-res ios --skip-config --copy
```

### 4. Configurar certificados en Xcode
1. Abrir proyecto: `npx cap open ios`
2. Ir a Signing & Capabilities
3. Seleccionar tu Team de desarrollo
4. Configurar provisioning profiles

## Compilación para producción

```bash
# Build optimizado
ionic build --prod

# Sincronizar con iOS
npx cap sync ios

# Abrir en Xcode para archivo
npx cap open ios
```

En Xcode:
1. Product → Archive
2. Distribute App
3. App Store Connect
4. Upload

## Testing

### Unit Tests
```bash
npm test
```

### E2E Tests
```bash
npm run e2e
```

### Test en TestFlight
1. Subir build a App Store Connect
2. Configurar pruebas beta en TestFlight
3. Invitar testers

## Variables de entorno

Crear archivo `src/environments/environment.prod.ts`:
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://api.boilyjs.com'
};
```

## Comandos útiles

```bash
# Actualizar Capacitor
npm update @capacitor/core @capacitor/ios

# Limpiar cache
npm run clean

# Ver logs de iOS
npx cap run ios -l --external

# Sincronizar solo configuración
npx cap sync ios --deployment
```

## Solución de problemas

### Pod install falla
```bash
cd ios/App
pod repo update
pod install
```

### Certificados no válidos
- Revisar Apple Developer Account
- Renovar provisioning profiles
- Limpiar derived data en Xcode

### App no conecta con backend
- Verificar configuración de CORS en backend
- Revisar URL de API en environments
- Verificar certificados SSL

## Soporte

Para problemas específicos de iOS/Capacitor:
- [Capacitor iOS Documentation](https://capacitorjs.com/docs/ios)
- [Ionic Framework Docs](https://ionicframework.com/docs)
- [Apple Developer Documentation](https://developer.apple.com/documentation/)

## Licencia

MIT