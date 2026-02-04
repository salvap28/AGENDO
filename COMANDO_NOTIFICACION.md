# Comando para enviar notificación a todos los usuarios

## Opción 1: Usando curl (desde terminal)

```bash
curl -X POST http://localhost:4000/api/notifications/broadcast \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -d '{
    "title": "🎉 Nueva Actualización: Planeación Inteligente 2.0!",
    "message": "La IA ahora te hace preguntas inteligentes para crear planes más personalizados. Podés editar horarios directamente en el plan generado (hover sobre las tareas) y elegir si actualizar solo una instancia o todas las futuras. ¡Probá la nueva experiencia en Planear el día → Planeación Inteligente!"
  }'
```

## Opción 2: Versión corta

```bash
curl -X POST http://localhost:4000/api/notifications/broadcast \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -d '{
    "title": "🎉 Planeación Inteligente 2.0 disponible",
    "message": "La IA ahora hace preguntas para personalizar tu plan. Editá horarios con hover y actualizá tareas repetidas fácilmente. ¡Probá en Planear el día!"
  }'
```

## Opción 3: Desde PowerShell (Windows)

```powershell
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer TU_TOKEN_AQUI"
}

$body = @{
    title = "🎉 Nueva Actualización: Planeación Inteligente 2.0!"
    message = "La IA ahora te hace preguntas inteligentes para crear planes más personalizados. Podés editar horarios directamente en el plan generado (hover sobre las tareas) y elegir si actualizar solo una instancia o todas las futuras. ¡Probá la nueva experiencia en Planear el día → Planeación Inteligente!"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:4000/api/notifications/broadcast" -Method POST -Headers $headers -Body $body
```

## Notas importantes:

1. **Reemplazá `TU_TOKEN_AQUI`** con un token JWT válido de un usuario autenticado
2. **Cambiá `localhost:4000`** por la URL de tu servidor si está en producción
3. El endpoint requiere autenticación (`requireAuth`), así que necesitás un token válido
4. La notificación se enviará a todos los usuarios que tengan suscripciones push activas

## Para obtener un token:

Podés obtener un token haciendo login en la aplicación y copiando el token del localStorage o usando el endpoint de login:

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "tu-email@ejemplo.com",
    "password": "tu-password"
  }'
```

El token estará en la respuesta `{ token: "..." }`








