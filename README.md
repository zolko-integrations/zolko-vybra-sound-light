# ZOLKO × VYBRA Sound & Light — Landing de cotizaciones

Landing page de **VYBRA Sound & Light** ("Tu evento, otra vibra"), renta de sonido e iluminación para eventos en Guadalajara, Jalisco. Desarrollada por **ZOLKO INTEGRATIONS**.

## Páginas

| Página | Link | Qué hace |
| --- | --- | --- |
| Landing en vivo | https://zolko-integrations.github.io/zolko-vybra-sound-light/ | Arma el mensaje y abre WhatsApp. No guarda datos. |
| Página de prueba | https://zolko-integrations.github.io/zolko-vybra-sound-light/prueba/ | Igual que la de arriba, pero además guarda cada solicitud en Google Sheets y la agenda en Google Calendar. |

## Cómo funciona la página de prueba

1. El cliente llena el formulario y toca **Enviar solicitud y abrir WhatsApp**. Tiene que aceptar el aviso de privacidad.
2. La página manda los datos al script de Google (`apps-script/Code.gs`, publicado como aplicación web).
3. El script guarda una fila en la hoja **VYBRA — Solicitudes de cotización**, con fecha y hora de llegada y estatus "Nuevo".
4. El script crea un evento amarillo, **POR CONFIRMAR**, en el calendario **VYBRA Eventos**, en la fecha y hora del evento y con 5 horas de duración.
5. Al mismo tiempo se abre WhatsApp con el mensaje armado, para que el cliente lo envíe.
6. Cuando cambia el **Estatus** en la hoja:
   - **Apartado, Pagado o Realizado:** el evento se pone verde y dice **CONFIRMADO**.
   - **Perdido:** el evento se borra del calendario.
   - Si cambia la fecha o la hora en la hoja, el evento se mueve.

La hoja, el script y el calendario están en la cuenta de Google de Ricardo, en la carpeta **ZOLKO — VYBRA**.

## Pendiente antes de pasar la página de prueba a la landing en vivo

- El nombre del responsable y un correo de contacto para el aviso de privacidad.
- Compartir la hoja y el calendario con Lulú.
- Fotos reales del equipo.

## Estructura

```
index.html          Landing en vivo
prueba/index.html   Página de prueba conectada a Google
img/                Flyers de los 3 paquetes
apps-script/Code.gs Copia del script de Google (la versión que corre está en script.google.com)
```

## Paquetes (de los flyers del 19 nov 2026)

Essential $2,990, Party $3,990 y Experience $4,990 (MXN), los tres de 5 horas. Cualquier cambio de precios o de lo que incluye cada paquete necesita aprobación.

---
ZOLKO INTEGRATIONS — Primero entendemos. Después integramos.
