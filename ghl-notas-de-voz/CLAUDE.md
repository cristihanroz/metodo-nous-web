# Proyecto: Notas de voz de GoHighLevel → Instagram y Facebook

## Quién soy y qué busco
- Soy Cristihan (Cristihan Roz), entrenador y empresario. Vendo suplementos online y un programa de coaching.
- Uso **GoHighLevel (GHL)** como CRM. Estoy pasando ahí mi sistema y mis SOPs, que hoy están repartidos en otras apps.
- **Quiero dejar de usar ManyChat.**
- Responde siempre en **español** y explica las decisiones técnicas en lenguaje simple antes de ejecutarlas.

## El problema
En los workflows de GHL no se pueden enviar audios de voz por Instagram ni por Facebook Messenger. ManyChat y Kommo sí lo permiten, y la API de Meta también, pero GHL nunca desarrolló esa función.

## Objetivo
Crear una integración propia que me dé **dos acciones nuevas en los workflows de GHL**:
1. **Enviar nota de voz por Instagram**
2. **Enviar nota de voz por Facebook Messenger**

El audio tiene que llegar como **nota de voz nativa** (la burbuja de audio de Instagram/Messenger), no como un archivo adjunto.

Fuera de alcance por ahora: WhatsApp (lo manejo con Kommo).

## Lo que ya sabemos (verificar contra la documentación actual)
- La API de Meta permite enviar un adjunto `type: "audio"` por URL o por `attachment_id`:
  - Instagram: `POST /<PAGE_ID>/messages` o `/<IG_ID>/messages` con `recipient.id = IGSID`
  - Messenger: `POST /<PAGE_ID>/messages` con `recipient.id = PSID`
- Ventana de 24 h: solo se puede responder dentro de las 24 h siguientes al último mensaje del usuario, salvo que se use una etiqueta (por ejemplo, human agent).
- Permisos de Meta: `pages_messaging`, `pages_show_list`, `pages_manage_metadata`, `pages_read_engagement`, `business_management`, `instagram_basic` e `instagram_manage_messages`.
- El acceso estándar solo funciona con usuarios que tienen un rol en la app o en la página. Hay que confirmar si basta para una app que solo usa mi propia página y mi propio Instagram, o si hace falta App Review y acceso avanzado.
- GHL tiene dos caminos:
  - **A. Webhook del workflow → mi servidor.** Es lo más simple y sirve para validar.
  - **B. App privada del Marketplace con acción personalizada.** Da una acción real con sus propios campos, pero es parte de "LC Premium Triggers & Actions", se cobra por ejecución y solo aparece en subcuentas que tengan la app instalada.

## Incógnitas críticas (resolver en este orden)
1. **¿El audio llega como nota de voz nativa?** No está documentado. Hay que probarlo con un prototipo enviándome un audio a mí mismo, en distintos formatos (m4a/aac, mp3, ogg/opus) y en Instagram y Messenger.
2. **¿Cómo obtengo el IGSID/PSID de un contacto de GHL?** GHL no los expone de forma obvia. Una opción es un webhook propio de Meta que los capture cuando el cliente escribe y los guarde en un campo personalizado del contacto en GHL.
3. **¿Puede mi app de Meta coexistir con la conexión de GHL** en la misma página y el mismo Instagram sin romper el inbox de GHL?
4. **¿El audio enviado aparece en el inbox de GHL?** Si no aparece, ¿lo registramos como nota del contacto o como mensaje por la API de conversaciones de GHL?
5. Permisos: ¿App Review sí o no?
6. ¿Camino A (webhook) o camino B (Marketplace)?

## Piezas que probablemente hagan falta
- App de Meta (developers.facebook.com) conectada a mi página y a mi Instagram profesional.
- Servidor pequeño (por ejemplo Vercel, Railway o Cloudflare Workers) con:
  - Endpoint que recibe la orden desde GHL (contacto, canal, URL del audio).
  - Webhook de Meta para capturar IGSID/PSID.
  - Llamada a la Send API de Meta.
- Hosting de los audios con URL pública. Conversión de formato si el prototipo demuestra que hace falta.
- Almacenamiento seguro de tokens: variables de entorno, nunca en el código.
- Manejo de errores visible: ventana de 24 h vencida, usuario sin ID, token caducado.

## Flujo de trabajo con skills
1. `/grill-me` → cerrar las decisiones de arriba.
2. `/research` → permisos de Meta, App Review, formatos de audio y acciones personalizadas de GHL (con citas).
3. `/prototype` → prueba mínima de envío de audio a Instagram y Messenger. **No avanzar sin esto.**
4. `/wizard` → guía paso a paso para lo que tengo que hacer yo a mano (crear la app de Meta, tokens, GHL).
5. `/to-spec` y luego `/to-tickets`.
6. `/implement` (usa tdd y code-review).
7. `/diagnosing-bugs` si algo falla y `/handoff` al cerrar cada sesión.

## Reglas
- No hacer nada irreversible ni que gaste dinero sin preguntarme.
- No enviar mensajes a clientes reales durante las pruebas, solo a mis cuentas de prueba.
- Nunca guardar tokens ni claves en archivos del repositorio.
- Antes de afirmar algo sobre la API de Meta o la de GHL, verificarlo en la documentación oficial actual.

## Referencias
- Instagram Messaging (enviar mensajes): https://developers.facebook.com/documentation/business-messaging/instagram-messaging/features/send-message
- Subir adjuntos (Instagram): https://developers.facebook.com/documentation/business-messaging/instagram-messaging/features/attachment-upload
- Messenger Platform (overview y permisos): https://developers.facebook.com/documentation/business-messaging/messenger-platform/overview
- GHL Marketplace, acciones personalizadas: https://marketplace.gohighlevel.com/docs/marketplace-modules/CustomActions
- GHL Workflow Triggers & Actions: https://marketplace.gohighlevel.com/docs/marketplace-modules/WorkflowActionsAndTriggers
