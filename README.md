# Chaska Empleo UC - Versión Avanzada

Plataforma universitaria de oportunidades laborales seguras en Cusco, Universidad Continental.

## Arquitectura
- **Backend:** Node.js con Express y Sesiones persistentes.
- **Base de datos:** PostgreSQL.
- **IA:** OpenAI API (con cuota de tokens por plan).
- **Seguridad y Auth:** Bcrypt para contraseñas, Nodemailer para verificación por correo.

## Despliegue en la Nube (Recomendado sobre Netlify)
Dado que Netlify es estático, para esta versión avanzada con base de datos y backend Node.js se recomienda utilizar plataformas PaaS gratuitas o de bajo costo:
1. **Render (render.com):** Conecta tu repositorio GitHub, crea un Web Service (Node.js) y una base de datos PostgreSQL en segundos.
2. **Railway (railway.app):** Excelente soporte para Node.js y PostgreSQL con despliegue automático.
3. **Fly.io:** Despliegue robusto mediante contenedores.
