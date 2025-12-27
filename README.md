# MenuPro Backend API

Backend API para MenuPro - Sistema de gestión de menús digitales con QR.

## 🚀 Stack Tecnológico

- **Runtime**: Bun
- **Framework**: Express.js + TypeScript
- **Database**: PostgreSQL (Supabase)
- **Auth**: Supabase Auth
- **Validation**: Zod
- **QR Codes**: qrcode

## 📋 Requisitos Previos

- [Bun](https://bun.sh) instalado (`curl -fsSL https://bun.sh/install | bash`)
- Cuenta de [Supabase](https://supabase.com)
- Node.js 18+ (solo para compatibilidad de herramientas)

## 🛠️ Instalación

1. **Clonar e instalar dependencias**:
```bash
bun install
```

2. **Configurar variables de entorno**:
```bash
cp .env.example .env
```

Edita `.env` con tus credenciales de Supabase.

3. **Ejecutar migraciones de base de datos**:
Ejecuta los scripts SQL en Supabase SQL Editor:
- `database_schema.sql` (esquema completo)
- `migration_cadenas.sql` (migración de cadenas)

## 🏃 Ejecución

### Desarrollo (con hot reload):
```bash
bun dev
```

### Producción:
```bash
bun start
```

### Build:
```bash
bun run build
```

## 📁 Estructura del Proyecto

```
src/
├── config/          # Configuración (Supabase, env)
├── middleware/      # Middlewares (auth, validación, errores)
├── routes/          # Rutas de la API
├── services/        # Lógica de negocio
├── types/           # Tipos de TypeScript
├── utils/           # Utilidades (response, slugify)
└── index.ts         # Entry point

scripts/
└── migrate.ts           # Script de migración de DB

sql_files/
├── database_schema.sql      # Schema completo de DB
├── migration_cadenas.sql    # Migración para cadenas
└── ejemplos_cadenas.sql     # Ejemplos de uso
```

## 🔑 API Endpoints

### Health Check
- `GET /api/health` - Verificar estado del servidor

### Restaurants
- `GET /api/restaurants` - Listar restaurants (autenticado)
- `GET /api/restaurants/:id` - Obtener restaurant
- `POST /api/restaurants` - Crear restaurant
- `PATCH /api/restaurants/:id` - Actualizar restaurant
- `DELETE /api/restaurants/:id` - Eliminar restaurant (soft delete)

### Menus
- `GET /api/menus/restaurant/:restaurantId` - Listar menús de un restaurant
- `GET /api/menus/public/:restaurantSlug/:menuSlug` - Ver menú público
- `POST /api/menus` - Crear menú
- `PATCH /api/menus/:id/publish` - Publicar/despublicar menú

## 🔒 Autenticación

Usa JWT de Supabase en el header:
```
Authorization: Bearer <token>
```

## 🧪 Testing

```bash
bun test
```

## 📦 Próximas Features

- [ ] CRUD completo de secciones y items
- [ ] Generación de QR codes
- [ ] Exportar menú a PDF
- [ ] Upload de imágenes
- [ ] Analytics de vistas
- [ ] Gestión de cadenas (sucursales)
- [ ] Webhooks para pagos

## 🤝 Contribuir

1. Fork el proyecto
2. Crea tu feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

MIT
