# Proyecto: Test "¿Estás listo para un déficit calórico?" — Cristihan Roz

## Qué es
Página propia (en dominio de Cristihan) con un test de 24 preguntas para hombres (público: empresarios que descuidaron su físico). Calcula las calorías de déficit óptimas según el riesgo de abandono, califica al lead en secreto (adherencia, motivación, capacidad de inversión) y envía todo a **Kommo** por su API mediante una integración privada propia. Además genera **links personalizados** para leads que ya están en Kommo y registra si el lead agenda en **Calendly**.

Idioma de todo el producto: español neutro (Ecuador/LatAm). Moneda: USD.

## Decisiones tomadas
- Front: una sola página estática (HTML + CSS + JS, sin framework pesado), mobile-first, una pregunta por pantalla con barra de progreso.
- Backend: funciones serverless. **Por defecto Netlify Functions**; alternativa Cloudflare Workers/Pages Functions. Confirmar con Cristihan al empezar.
- Sin herramientas de terceros de formularios (nada de involve.me/Tally/Make).
- El token de Kommo NUNCA va en el front ni en el repo: variable de entorno.
- El servidor **recalcula** puntuaciones y calorías; no confía en lo que mande el navegador.
- Antispam: Cloudflare Turnstile.

## Pendiente de Cristihan (usar placeholders en config hasta tenerlos)
Dominio y dónde está el DNS · subdominio Kommo (`xxx.kommo.com`) · número de WhatsApp · enlace de Calendly · logo y colores · URL de política de privacidad · IDs de embudo, etapas y campos de Kommo (obtenerlos por API con un script).

## Arquitectura
```
/public/index.html        test + páginas de resultado
/public/privacidad.html   política de privacidad (datos de salud)
/functions/submit         guarda el test (crea o actualiza lead)
/functions/open           marca "Test abierto" cuando llega con token
/functions/kommo-webhook  recibe webhook del pipeline digital y genera link firmado
/functions/calendly-webhook mueve lead a "Llamada agendada"
/lib/scoring.js           lógica compartida front/back (fórmulas y puntos)
/lib/kommo.js             cliente API Kommo v4
/lib/token.js             firma/verifica tokens HMAC
/scripts/kommo-ids.js     lista embudos, etapas y campos para llenar config
config                    IDs de Kommo, enlaces, textos
```

### Variables de entorno
`KOMMO_SUBDOMAIN`, `KOMMO_TOKEN` (long-lived token de integración privada), `LINK_SECRET` (HMAC), `KOMMO_WEBHOOK_KEY`, `CALENDLY_SIGNING_KEY`, `TURNSTILE_SECRET`.

### Kommo API v4 (base `https://{sub}.kommo.com/api/v4`, `Authorization: Bearer`)
- Buscar contacto por teléfono: `GET /contacts?query=<tel>`
- Crear lead + contacto: `POST /leads/complex` (pipeline_id, status_id, custom_fields_values, tags)
- Actualizar lead: `PATCH /leads/{id}`
- Nota: `POST /leads/{id}/notes` (common)
- Campos: `GET /leads/custom_fields`, `GET /contacts/custom_fields`
Verificar detalles actuales en la documentación oficial de Kommo antes de implementar.

### Link personalizado (lead existente)
1. Etapa "Enviar test" en Kommo → acción webhook del pipeline digital → `/kommo-webhook?key=KOMMO_WEBHOOK_KEY` (Kommo envía form-urlencoded con el id del lead).
2. La función crea token `base64url(leadId.exp) + "." + HMAC-SHA256` (vence en 30 días), guarda `https://test.dominio.com/?t=TOKEN` en el campo URL "Link del test" del lead.
3. Un salesbot de Kommo en esa etapa envía el link por WhatsApp usando el campo.
4. Al abrir con token → `/open` → lead a "Test abierto". Al terminar → `/submit` actualiza ESE lead y lo pasa a "Test completado".
5. Sin token (bio, historias, anuncios) → buscar por teléfono; si no existe, crear lead nuevo en etapa "Nuevo test".

### Calendly
El botón del nivel A abre Calendly con `?name=&email=` y el token en `utm_content`. Webhook `invitee.created` (requiere plan de pago de Calendly; verificar firma) → leer token → lead a "Llamada agendada".

## Embudo Kommo "Test déficit"
Etapas: Enviar test · Test abierto · Nuevo test · Test completado · Escribió por WhatsApp · Calificado · Llamada agendada · Cliente.
Etiquetas: test-deficit, nivel-a, nivel-b, nivel-c, alerta-medica.
Activar control de duplicados por teléfono.

## Campos a enviar al lead
Nivel test (A/B/C) · Perfil test (Acelerar/Estrategia/Suave/Profesional) · Calorías objetivo · Mantenimiento · Déficit % · Kg en 90 días · Proteína g · Adherencia · Motivación · Inversión · Edad · Peso · Altura · Grasa estimada · Qué le molesta (multi) · Hace cuánto · Dietas pasadas · Cuándo empieza · Ocupación · Qué ha probado (multi) · Gasto suplementos · Cómo quiere lograrlo · Alerta médica · Origen (UTM) · Link del test · Resumen para el setter (nota + campo).
Resumen ejemplo: "Empresario, 42 años, 95 kg. Le molesta la barriga y la falta de energía. Probó nutricionista y gimnasio, rebota en las dietas. Quiere empezar este mes. Calorías: 2.000."

## Preguntas y puntos
Puntos entre corchetes; el lead nunca los ve.

**Bloque 1 · Datos**
1. Edad (número). <18 → fin: "Este test es solo para mayores de 18 años", no se envía nada.
2. Peso kg (opción libras: kg = lb × 0.4536).
3. Altura cm.
4. Foto más parecida (grasa): Marcado, se ven abdominales [15] · Algo de barriga, atlético [20] · Barriga notoria [25] · Barriga grande y cintura ancha [30] · Sobrepeso evidente en todo el cuerpo [35].
5. Movimiento diario: Casi todo el día sentado [+0.00] · Camino algo, <6.000 pasos [+0.10] · 6.000–10.000 pasos [+0.20] · De pie o caminando casi todo el día [+0.30].
6. Días de entreno: Ninguno [+0] · 1–2 [+0.075] · 3–4 [+0.15] · 5+ [+0.225].

**Bloque 2 · Hábitos → Adherencia (0–24)**
7. Sueño: <5 [0] · 5–6 [1] · 6–7 [2] · 7+ [3]
8. Estrés: Al tope casi a diario [0] · Alto varios días [1] · Manejable [2] · Bajo [3]
9. Comidas fuera/delivery/trabajo por semana: 5+ [0] · 3–4 [1] · 1–2 [2] · Casi nunca [3]
10. Alcohol: Varias veces/semana [0] · Fines de semana, y no poco [1] · Social, poco [2] · No tomo [3]
11. Cuándo cuesta controlar: Por estrés/ansiedad sin darme cuenta [0] · En la noche tras cenar [1] · Me salto comidas y llego con mucha hambre [1] · Casi nunca [3]
12. Dietas previas: Varias veces, bajo y recupero todo o más [0] · Una o dos, bajé y recuperé [1] · Nunca en serio [2] · Bajé y mantuve [3]
13. Quién cocina: Lo que haya/delivery [0] · Pareja/familia sin control [1] · Yo me organizo [3] · Tengo quien cocine (empleada/servicio) [3, +1 Inversión]
14. Comer 20 % menos desde mañana: No aguantaría, hambre y mal humor [0] · Costaría, sobre todo de noche [1] · Aguanto si veo resultados [2] · Tranquilo, controlo el hambre [3]

**Bloque 3 · Dolor y deseo → Motivación (0–16)**
15. Qué molesta (multi, +1 c/u, máx 4): barriga/sin camisa · falta de energía · ropa no queda · el médico dijo que baje de peso · inseguro con mi pareja · fotos · no doy la imagen que mi negocio necesita
16. Hace cuánto: <6 meses [1] · 6 meses–2 años [2] · >2 años [3]
17. Si en 12 meses sigues igual: No pasa nada [0] · Molestaría, puedo vivir con eso [1] · Frustraría bastante [2] · No me lo puedo permitir: salud, imagen y negocio [3]
18. Importancia 1–10 en 90 días: 1–6 [0] · 7 [1] · 8 [2] · 9–10 [3]
19. Cuándo empezar: Esta semana [3] · Este mes [2] · En unos meses [1] · Solo curiosidad [0 → nivel C]

**Bloque 4 · Lo intentado → Inversión (0–17, incluye +1 de la 13)**
20. Ocupación: Empresa propia con equipo [4] · Gerente/director [3] · Independiente/consultor [3] · Empleado [1] · Estudiante/sin trabajo fijo [0]
21. Qué ha probado (multi, suma, máx 6): Nada [0] · Apps/planes gratis [0] · Gimnasio solo [1] · Pastillas, quemadores o inyecciones [2] · Nutricionista [2] · Entrenador personal [3] · Coach/programa online [3] · Tratamientos estéticos [3] · Cirugía (lipo, manga, balón) [4]
22. Gasto mensual en suplementos: Nada [0] · <$30 [1] · $30–80 [2] · >$80 [3]
23. Cómo lograrlo: Solo con info gratis [0] · Plan para seguir solo [1] · Coach 1 a 1 con seguimiento [3]

**Bloque 5 · Salud**
24. Condiciones (multi): Diabetes/prediabetes · Presión alta/corazón · Tiroides · Medicación diaria · Trastorno de conducta alimentaria (actual o pasado) · Ninguna. Cualquiera ≠ Ninguna → Alerta médica. TCA → perfil "Primero, un profesional" sin calorías.

**Contacto (antes del resultado):** nombre, WhatsApp con código de país, email, casilla obligatoria: "Acepto que Cristihan Roz guarde mis respuestas y me contacte por WhatsApp con mi resultado." + enlace a privacidad. Si llega con token, prellenar lo que se sepa y no pedir de nuevo lo innecesario.

## Fórmulas
```
TMB = 10*peso + 6.25*altura - 5*edad + 5            (Mifflin-St Jeor, hombres)
Mantenimiento = TMB * (1.2 + P5 + P6)
Déficit base: Adherencia 17–24 → 20 % · 9–16 → 15 % · 0–8 → 10 %
Ajuste grasa: ≥30 → +5 pts · 15 → −5 pts · límite 10–25 %
Calorías = round(max(Mant*(1-déficit), TMB, 1500) / 50) * 50
Kg90 = (Mant - Calorías) * 90 / 7700   (1 decimal, "aprox.")
Proteína g = round(2.4 * peso * (1 - grasa/100))
Palanca (opcional): mantenimiento con factor 1.55 → "comer más y bajar más"
```
Caso de prueba: 42 años, 95 kg, 176 cm, grasa 25, P5 +0, P6 +0.075, Adherencia 11 → TMB 1845, Mant 2352, déficit 15 %, Calorías 2000, ~4.1 kg/90 días, proteína ~171 g.

## Nivel del lead (interno)
- A: Motivación ≥10 y Inversión ≥8
- B: Motivación ≥10 con Inversión <8, o Motivación 6–9 con Inversión ≥8
- C: resto, o P19 = curiosidad

## Resultados que ve el lead
| Perfil | Cuándo | Titular |
|---|---|---|
| Listo para acelerar | Adherencia 17–24 | "Estás listo para un déficit: tu número es {cal} kcal" |
| Listo, con estrategia | 9–16 | "Puedes hacer déficit, pero con estrategia: {cal} kcal" |
| Déficit suave primero | 0–8 | "Hoy un déficit fuerte te haría rebotar: empieza con {cal} kcal" |
| Primero, un profesional | P24 = TCA | "Tu salud va primero" (sin número) |

Mostrar mantenimiento, calorías, proteína y kg aprox. en 90 días. Banner si alerta médica: "Por tu condición, revisa este número con tu médico antes de empezar." Hasta 2 "frenos" según respuestas con 0 en P7, P9, P10, P11, P14.

Botón por nivel: A → "Agenda tu llamada de diagnóstico gratis" (Calendly) · B → "Recibe tu plan por WhatsApp" (wa.me con mensaje "Hola Cristihan, hice el test. Mi resultado: {cal} kcal") · C → "Recibe tu guía gratis por WhatsApp" + enlace a tienda de suplementos.

## Reglas de trabajo
- Empezar por `lib/scoring.js` con tests unitarios (incluir el caso de prueba de arriba y casos A, B, C, alerta médica, menor de 18).
- Luego el front, luego `submit`, luego links firmados y Calendly.
- Probar contra Kommo con un lead de prueba antes de publicar.
- WhatsApp: fuera de la ventana de 24 h solo se puede escribir con plantillas aprobadas; por eso el lead B/C escribe primero.

## Ubicación en este repo (decidido con Cristihan)
- Vive en la carpeta `/test` del repo de la landing y se publica en `nousmetodo.com/test/` (mismo sitio de Netlify). Backend: Netlify Functions.
- `/test/index.html`, `/test/app.js`, `/test/test.css` (usa los tokens de `/styles.css`), `/test/config.js` (placeholders), `/test/lib/scoring.js`, `/test/privacidad.html` (borrador).
- Tests: `node --test test/lib/scoring.test.js`.
- `/_redirects` bloquea la publicación de este archivo y de los tests.
- Decisión: el perfil TCA no recibe el botón de llamada de venta; solo un contacto opcional por WhatsApp.
