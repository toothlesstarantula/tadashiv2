# Configuración de Dokploy

Aquí tienes las variables de entorno necesarias para configurar tus servicios en Dokploy.

## 1. Server (Backend)
**Dominio:** `tadashapi.tarantulapps.pro`

Ve a la pestaña **Environment** de tu servicio de servidor y añade:

```env
# Conexión a Base de Datos (PostgreSQL)
DATABASE_URL="postgresql://usuario:password@host:5432/base_de_datos?schema=public"

# URL del Frontend (para CORS y Auth)
CLIENT_URL="https://tadashi.tarantulapps.pro"

# Configuración de Better Auth
# Genera un secreto seguro (puedes usar `openssl rand -hex 32`)
BETTER_AUTH_SECRET="tu_secreto_super_seguro_aqui"
# URL donde corre este servidor
BETTER_AUTH_URL="https://tadashapi.tarantulapps.pro"

# API Keys para IA
OPENAI_API_KEY="sk-..."

# Puerto (Opcional, el Dockerfile ya expone el 3000)
PORT=3000
```

---

## 2. Client (Frontend)
**Dominio:** `tadashi.tarantulapps.pro`

**IMPORTANTE:** Como es una aplicación Vite (SPA), la variable de API debe inyectarse en tiempo de construcción.

Ve a la pestaña **Build Args** (o "Argumentos de Construcción") y añade:

```env
VITE_API_URL="https://tadashapi.tarantulapps.pro"
```

*Nota: Si Dokploy no tiene una sección específica de "Build Args", intenta ponerla en "Environment Variables". El Dockerfile está configurado para leer `ARG VITE_API_URL` y pasarla como variable de entorno durante el build.*
