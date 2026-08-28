# HU Audit — Especificación Funcional y de Infraestructura

> Documento de referencia para el equipo de IT y gestión operativa.

---

## 1. ¿Qué es HU Audit?

HU Audit es un sistema web de auditoría de pallets (Handling Units) armados en el hub de distribución. Permite a los auditores comparar en tiempo real lo que el sistema registra dentro de un pallet contra lo que físicamente está dentro del mismo, detectando discrepancias y generando registros del día para análisis operativo.

El sistema opera en **dos plantas** (CIU y EEV), cada una con su propia PC servidor backend. El frontend está publicado como sitio estático en GitHub Pages y se conecta al backend de la planta correspondiente según la selección del usuario.

---

## 2. Módulos funcionales

### 2.1 Cargar CSV

- El auditor carga el archivo `.csv` exportado del sistema de gestión del hub.
- El parser tolera formatos de notación científica en IDs numéricos largos (problema conocido de Excel/Google Sheets al exportar).
- Los datos quedan cargados en memoria de la sesión del navegador. No se persisten en el servidor.
- **Sin CSV cargado, no es posible realizar ninguna auditoría.**

### 2.2 Auditoría HU (flujo principal)

Flujo de 4 pasos guiados:

| Paso | Descripción |
|------|-------------|
| 1 — Datos | Fecha, turno (TM / TT / TN) y modo de auditoría |
| 2 — HU + Scanner | Búsqueda del HU a auditar y bipeo de shipments con pistola lectora |
| 3 — Resultado | Comparación automática contra el dataset del sistema |
| 4 — Observaciones | Anotaciones libres del auditor antes de guardar |

**Modos de auditoría:**
- **Voluminoso:** escaneo masivo, luego comparación global del HU completo.
- **Paquetería:** análisis shipment por shipment en tiempo real durante el escaneo.

**Estados posibles por shipment:**

| Estado | Descripción |
|--------|-------------|
| `ok` | Bipeado y coincide con el sistema |
| `missing` | En sistema pero no bipeado (faltante) |
| `crossed` | Bipeado pero pertenece a otro HU (cruzado) |
| `unmanifested` | Bipeado pero no existe en ningún HU del dataset |
| `surplus` | Bipeado pero no registrado en sistema (sobrante) |

La auditoría calcula automáticamente: usuario(s) de armado del HU, Sub-CA principal, totales por estado y HUs origen de cruzados.

### 2.3 Dashboard

Métricas del día de las auditorías guardadas:

- HUs auditados, HUs con desviación, % de error del día.
- Faltantes / cruzados / sin manifestar agrupados por fecha y turno.
- Estadísticas por Sub-CA: totales de shipments y errores por zona de etiquetado.
- Filtros por fecha y turno.
- Exportación a Excel/CSV.

### 2.4 Plan de Auditoría

- El admin define el plan del día por turno: qué Sub-CAs auditar, cuántos HUs y piezas objetivo, y qué auditor tiene asignada cada zona.
- El sistema compara el plan contra lo efectivamente auditado y muestra el avance en tiempo real.

### 2.5 Post-Audit

- Permite cargar un segundo CSV tomado luego de que operaciones corrigió los errores detectados.
- El sistema cruza automáticamente los errores de la auditoría contra el nuevo CSV:
  - Faltante → ¿fue removido del HU?
  - Sobrante → ¿fue agregado al HU correcto?
  - Cruzado → ¿fue movido al HU que corresponde?
- Genera estadísticas de tasa de corrección del día.

### 2.6 Gestión de Usuarios

- Roles: `admin` (gestiona usuarios, no audita) y `auditor` (opera el sistema).
- El admin crea, desactiva y elimina usuarios con contraseña.
- Sesión por JWT con expiración configurable.
- Cada auditoría queda vinculada al auditor que la realizó.

### 2.7 Rendimiento de Auditores

- Visible solo para el rol `admin`.
- Muestra por auditor: HUs auditados, shipments procesados, faltantes detectados, cruzados, tasa de error del día.
- Filtrable por fecha y turno.

---

## 3. Arquitectura del sistema

```
┌──────────────────────────────────────────────────────┐
│              GitHub Pages (CDN global)               │
│         Frontend — lleaguen.github.io/Auditoria      │
└──────────────┬───────────────────────┬───────────────┘
               │                       │
               ▼                       ▼
┌──────────────────────┐   ┌──────────────────────┐
│  PC Servidor — CIU   │   │  PC Servidor — EEV   │
│  Node.js + Postgres  │   │  Node.js + Postgres  │
│  Caddy (proxy HTTPS) │   │  Caddy (proxy HTTPS) │
└──────────────────────┘   └──────────────────────┘
```

El frontend permite al usuario seleccionar con qué planta conectarse. Cada planta tiene su propio servidor independiente con su propia base de datos.

---

## 4. Pros y contras del sistema actual

### ✅ Ventajas

- **Sin instalación en los clientes:** el frontend corre en el navegador, no requiere instalar nada en las PCs de auditoría.
- **Multi-planta:** soporta CIU y EEV, el usuario elige la planta desde la interfaz.
- **Tolerancia a formatos de CSV:** el parser maneja la pérdida de precisión en IDs por notación científica, problema habitual con archivos exportados desde Excel.
- **Datos del día persistentes:** las auditorías del turno quedan guardadas en el servidor local de cada planta.
- **Detección automática de cruces:** identifica shipments de otro HU y muestra su origen.
- **Post-audit:** ciclo cerrado de auditoría → corrección → verificación.

### ⚠️ Limitaciones actuales

- **CSV manual:** el auditor debe exportar y cargar el CSV antes de cada sesión. No hay integración directa con el sistema de gestión del hub.
- **Un CSV por sesión:** si el dataset cambia durante el turno, hay que recargar el archivo.
- **Certificado SSL de 24 horas:** Caddy genera un certificado autofirmado para la IP local con validez de 24 horas. Cada día, alguien debe ingresar manualmente a `https://<IP>` desde el navegador para aceptar la excepción de seguridad y rehabilitar la conexión. Sin este paso, todas las PCs de esa planta dejan de poder conectarse al backend.
- **IPs dinámicas:** la IP de cada PC servidor puede cambiar cuando se reinicia o por asignación del router. Si cambia, el frontend deja de poder conectarse y hay que actualizar la dirección manualmente.
- **Dependencia de TeamViewer para EEV:** actualmente, para acceder a los datos de EEV o reiniciar el servicio, es necesario que alguien en esa planta abra TeamViewer y permita la conexión remota. Esto genera una dependencia operativa que interrumpe el flujo de trabajo.
- **PCs servidoras deben estar encendidas 24/7:** si la PC se apaga o reinicia sin que el servicio Node.js arranque automáticamente, el sistema queda inaccesible para toda esa planta hasta que alguien lo restaure manualmente.
- **Datos aislados por planta:** no existe una vista consolidada entre CIU y EEV en tiempo real.

---

## 5. Necesidades para operación continua y acceso desde ambas plantas

### 5.1 Problema de la IP dinámica

Cada PC servidor necesita una **IP fija dentro de la red local** de su planta. Esto se resuelve de dos formas sin costo:

- **Opción A (recomendada):** solicitar a IT que reserve la IP de cada PC en el servidor DHCP del router de cada planta (se llama "reserva DHCP" o "IP estática por MAC"). La PC sigue usando DHCP pero siempre recibe la misma IP.
- **Opción B:** configurar la IP fija directamente en la interfaz de red de Windows en cada PC servidor.

Con la IP fija, el frontend siempre apunta al mismo lugar y no hay que actualizar nada cuando se reinicia la máquina.

### 5.2 Problema del certificado SSL de 24 horas

Este es el problema más disruptivo del día a día. Las opciones sin costo son:

**Opción A — DNS dinámico con DuckDNS (recomendada si se puede exponer el servidor):**
[DuckDNS](https://www.duckdns.org) es un servicio gratuito (basado en donaciones, sin costo obligatorio) que asocia un subdominio estable (ej: `hu-audit-ciu.duckdns.org`) a la IP actual de la PC. Con un dominio real, Caddy puede obtener un certificado SSL válido de Let's Encrypt y renovarlo automáticamente cada 90 días.

Requisitos: la PC servidor necesita acceso a internet, y el router debe redirigir el puerto 443 hacia la PC servidor (port forwarding). Si IT no permite exponer puertos al exterior, esta opción no aplica.

**Opción B — Aceptar la excepción una sola vez por navegador:**
Si no se puede exponer el servidor a internet, se puede instruir a cada auditor para que acepte la excepción de seguridad del certificado autofirmado una sola vez en su navegador. Chrome y Edge recuerdan la excepción hasta que el certificado vence. El problema es que hay que repetirlo cada 24 horas en cada PC.

**Opción C — HTTP en red interna (NO viable en este sistema):**
Aunque parezca una simplificación válida, esta opción no funciona. El frontend está servido desde GitHub Pages en HTTPS y los navegadores modernos bloquean **mixed content**: una página cargada por HTTPS no puede realizar requests a un endpoint HTTP. El navegador corta la conexión directamente, sin importar si el backend es accesible o no en la red.

### 5.3 Problema del acceso remoto a EEV (dependencia de TeamViewer)

El problema central es que Ciudad no puede operar ni administrar el servidor de EEV sin depender de que alguien en esa planta abra una sesión de acceso remoto. Las alternativas sin costo:

**Opción A — Tunnel permanente con Cloudflare Tunnel (recomendada):**
[Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) tiene un plan Zero Trust Free que cubre hasta 50 usuarios sin costo. Instala un agente (`cloudflared`) en cada PC servidor que abre un túnel saliente hacia los servidores de Cloudflare. Esto permite:
- Acceder al backend de EEV desde Ciudad sin depender de TeamViewer.
- Tener una URL fija y estable (`https://hu-audit-eev.empresa.workers.dev` o similar) que no cambia aunque cambie la IP.
- HTTPS válido incluido, sin problema de certificados.
- El túnel es saliente desde la PC, por lo que no se necesita abrir puertos ni modificar el firewall de la empresa.

El único requisito es tener una cuenta en [cloudflare.com](https://cloudflare.com) y que la PC servidor tenga acceso a internet. El plan gratuito cubre hasta 50 usuarios; si en algún momento se supera ese límite, pasaría a un plan pago.

**Opción B — SSH Reverse Tunnel:**
Técnicamente posible pero requiere un servidor VPS externo con IP fija (tiene costo) o servicios como [localhost.run](https://localhost.run) o [serveo.net](https://serveo.net) que ofrecen tunnels SSH. La estabilidad y continuidad de estos servicios no está garantizada a largo plazo.

**Opción C — VPN site-to-site:**
Si la empresa ya tiene o puede configurar una VPN entre plantas (OpenVPN, WireGuard — ambos de código abierto sin costo de licencia), Ciudad y EEV quedarían en la misma red virtual. Requiere configuración de red por parte de IT y hardware compatible.

### 5.4 Problema del servicio que no arranca automáticamente

El proceso Node.js debe configurarse como servicio del sistema operativo para que arranque solo cuando se enciende la PC, sin intervención manual:

- **En Windows:** usando [NSSM](https://nssm.cc/) (dominio público, sin costo) o la tarea programada de Windows configurada para ejecutar el servidor al iniciar el sistema.
- **En Linux:** usando `systemd` (viene incluido en todas las distribuciones modernas).

Con esto, aunque la PC se reinicie por actualizaciones de Windows u otro motivo, el servicio vuelve solo.

### 5.5 Resumen de necesidades por planta

| Necesidad | Solución recomendada | Costo |
|-----------|---------------------|-------|
| IP fija en red local | Reserva DHCP en router | Sin costo (configuración de IT) |
| Certificado SSL sin intervención diaria | Cloudflare Tunnel (hasta 50 usuarios sin costo) o DuckDNS + Let's Encrypt (sin costo) | Ver condiciones de cada servicio |
| Acceso remoto a EEV sin TeamViewer | Cloudflare Tunnel (hasta 50 usuarios sin costo) | Ver condiciones |
| Servicio que arranque solo al encender la PC | NSSM — dominio público, sin costo de licencia | Sin costo |
| Acceso a datos de ambas plantas desde Ciudad | Cloudflare Tunnel en ambas PCs | Ver condiciones |

---

## 6. Flujo de trabajo ideal una vez resueltas las necesidades

```
Auditor en cualquier PC de CIU o EEV
  → Abre el navegador
  → Ingresa a https://lleaguen.github.io/Auditoria
  → Selecciona su planta (CIU o EEV)
  → Inicia sesión con su usuario y contraseña
  → Carga el CSV del turno
  → Audita HUs con la pistola lectora
  → Los resultados se guardan en el servidor de su planta
  → El admin en Ciudad puede ver el rendimiento de ambas plantas
     accediendo a la URL de cada servidor sin depender de nadie en EEV
```

---

## 7. Lo que queda fuera del sistema (por ahora)

- Vista consolidada en tiempo real de ambas plantas en una sola pantalla.
- Integración directa con el sistema de gestión del hub (sin CSV manual).
- Notificaciones automáticas ante errores graves detectados.
