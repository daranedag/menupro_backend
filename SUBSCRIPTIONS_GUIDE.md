# Sistema Modular de Suscripciones - MenuPro

## 📋 Descripción

Este documento explica el sistema modular de suscripciones implementado para MenuPro, que permite:

- **3 Tiers base**: Free, Basic, Pro
- **Features modulares**: Se pueden agregar/quitar a cualquier tier
- **Pricing flexible**: Cada feature tiene su precio, con descuentos por tier
- **Facturación automática**: Sistema de invoices con líneas detalladas
- **Prorrateo**: Ajustes proporcionales al agregar/quitar features
- **Historial completo**: Tracking de todos los cambios en suscripciones

---

## 🗂️ Estructura de la Base de Datos

### Tablas Principales

#### `tiers`
Define los planes base (Free, Basic, Pro)
- `base_price_monthly`: Precio mensual del tier
- `max_menus`: Cantidad de menús incluidos (-1 = ilimitado)
- `billing_cycle`: 'monthly' | 'annual'

#### `features`
Catálogo de features disponibles
- `key`: Identificador único (ej: 'pdf_export')
- `name`: Nombre para mostrar
- `base_price`: Precio mensual base
- `category`: 'design', 'content', 'analytics', etc.

#### `tier_features`
Define qué features incluye cada tier y con qué descuento
- `included_by_default`: Si viene gratis con el tier
- `discount_percentage`: Descuento sobre el precio base

#### `subscription_features`
Features activas de cada suscripción
- `price_at_purchase`: Precio histórico al momento de agregar
- `is_active`: Si está actualmente activa
- `removed_at`: Fecha de desactivación

#### `subscription_changes`
Historial de cambios (agregar/quitar features, cambio de tier)

#### `invoices` y `invoice_line_items`
Sistema de facturación con desglose detallado

---

## 🚀 Instalación y Configuración

### 1. Ejecutar la Migración

```bash
# Conectar a tu base de datos de Supabase
psql -h <tu-host> -U postgres -d postgres

# Ejecutar el script de migración
\i sql_files/migration_modular_subscriptions.sql
```

### 2. Verificar las Tablas

```sql
-- Ver tiers disponibles
SELECT * FROM tiers WHERE active = true;

-- Ver features disponibles
SELECT * FROM features WHERE active = true;

-- Ver relación tier-features
SELECT * FROM tier_available_features;
```

### 3. Configurar el Backend

Asegúrate de tener las rutas registradas en tu `index.ts`:

```typescript
import subscriptionRoutes from './routes/subscriptions'

app.use('/api/subscriptions', subscriptionRoutes)
```

---

## 📖 Guía de Uso

### Caso 1: Cliente se suscribe al Plan Basic

```typescript
// Frontend hace POST a /api/subscriptions
const response = await fetch('/api/subscriptions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    restaurant_id: 'uuid-del-restaurant',
    tier_id: 2, // Basic
    billing_cycle: 'monthly',
    feature_ids: [] // Sin features adicionales por ahora
  })
})

// Respuesta:
{
  "success": true,
  "data": {
    "subscription_id": "...",
    "tier_name": "basic",
    "tier_base_price": 9.99,
    "monthly_total": 9.99,
    "active_features": [
      { "feature_name": "Analíticas básicas", "price": 0 }, // Incluida
      { "feature_name": "Info de alérgenos", "price": 0 }   // Incluida
    ]
  }
}
```

### Caso 2: Cliente agrega feature "Exportación PDF"

```typescript
// POST /api/subscriptions/{subscription_id}/features
const response = await fetch(`/api/subscriptions/${subscriptionId}/features`, {
  method: 'POST',
  body: JSON.stringify({
    feature_id: 1, // pdf_export
    prorated: false // No prorratear, cobrar desde siguiente ciclo
  })
})

// El sistema:
// 1. Verifica que pdf_export no esté ya activa
// 2. Calcula precio: $4.99 - 20% descuento (por ser tier Basic) = $3.99
// 3. La agrega a subscription_features
// 4. Registra el cambio en subscription_changes
// 5. El nuevo monthly_total será: $9.99 + $3.99 = $13.98
```

### Caso 3: Cliente quita una feature

```typescript
// DELETE /api/subscriptions/{subscription_id}/features/{feature_id}
await fetch(`/api/subscriptions/${subscriptionId}/features/1`, {
  method: 'DELETE',
  body: JSON.stringify({
    prorated: true // Reembolsar proporcionalmente
  })
})

// El sistema:
// 1. Marca la feature como inactiva (is_active = false, removed_at = now)
// 2. Calcula reembolso proporcional según días restantes del ciclo
// 3. Registra en subscription_changes con amount_adjustment negativo
// 4. En el siguiente invoice, se reflejará el ajuste
```

### Caso 4: Cliente cambia de tier (upgrade)

```typescript
// PATCH /api/subscriptions/{subscription_id}/tier
await fetch(`/api/subscriptions/${subscriptionId}/tier`, {
  method: 'PATCH',
  body: JSON.stringify({
    new_tier_id: 3, // Pro
    prorated: true
  })
})

// El sistema:
// 1. Actualiza el tier_id de la suscripción
// 2. Recalcula precios de features según descuentos del nuevo tier
// 3. Features que antes se pagaban pueden pasar a ser gratis (incluidas en Pro)
// 4. Registra el cambio en subscription_changes
// 5. Genera ajuste proporcional para el período actual
```

---

## 🎯 Ejemplos de Funciones SQL

### Calcular precio total de una suscripción

```sql
SELECT calculate_subscription_total_price('uuid-de-la-suscripcion');
-- Retorna: 29.99
```

### Agregar feature programáticamente

```sql
SELECT add_feature_to_subscription(
  'uuid-de-la-suscripcion',
  5, -- feature_id de 'unlimited_images'
  false -- sin prorrateo
);
-- Retorna: UUID del subscription_feature creado
```

### Ver pricing detallado

```sql
SELECT * FROM subscriptions_with_pricing 
WHERE subscription_id = 'uuid-de-la-suscripcion';
```

---

## 💰 Flujo de Facturación

### 1. Generación Automática (Cron Job)

```typescript
// Ejecutar diariamente
async function generateMonthlyInvoices() {
  const { data: dueSubscriptions } = await supabase
    .from('restaurant_subscriptions')
    .select('*')
    .eq('active', true)
    .lte('next_billing_date', new Date().toISOString())

  for (const sub of dueSubscriptions) {
    const periodStart = new Date(sub.next_billing_date)
    const periodEnd = new Date(periodStart)
    periodEnd.setMonth(periodEnd.getMonth() + 1)

    // Generar factura
    const invoiceId = await subscriptionService.generateInvoice(
      sub.id,
      periodStart,
      periodEnd
    )

    // Intentar cobrar con Stripe/PayPal
    await processPayment(invoiceId)

    // Actualizar next_billing_date
    await supabase
      .from('restaurant_subscriptions')
      .update({ next_billing_date: periodEnd.toISOString() })
      .eq('id', sub.id)
  }
}
```

### 2. Webhook de Pago (Stripe)

```typescript
app.post('/webhooks/stripe', async (req, res) => {
  const event = req.body

  if (event.type === 'invoice.payment_succeeded') {
    const invoiceNumber = event.data.object.metadata.invoice_number

    // Buscar factura
    const { data: invoice } = await supabase
      .from('invoices')
      .select('id')
      .eq('invoice_number', invoiceNumber)
      .single()

    // Marcar como pagada
    await subscriptionService.markInvoiceAsPaid(
      invoice.id,
      'stripe',
      { stripe_invoice_id: event.data.object.id }
    )
  }

  res.json({ received: true })
})
```

---

## 🔧 Configuración de Tiers y Features

### Modificar Precios

```sql
-- Actualizar precio de un tier
UPDATE tiers 
SET base_price_monthly = 39.99 
WHERE name = 'pro';

-- Actualizar precio de una feature
UPDATE features 
SET base_price = 6.99 
WHERE key = 'pdf_export';

-- Cambiar descuento de una feature para un tier
UPDATE tier_features 
SET discount_percentage = 50 
WHERE tier_id = 3 AND feature_id = 10;
```

### Agregar Nueva Feature

```sql
INSERT INTO features (key, name, description, category, base_price)
VALUES (
  'white_label',
  'Marca Blanca',
  'Elimina la marca MenuPro de tus menús',
  'design',
  19.99
);

-- Incluirla gratis en tier Pro
INSERT INTO tier_features (tier_id, feature_id, included_by_default)
VALUES (
  (SELECT id FROM tiers WHERE name = 'pro'),
  (SELECT id FROM features WHERE key = 'white_label'),
  true
);
```

---

## 📊 Queries Útiles

### Ver resumen de suscripciones activas

```sql
SELECT 
  r.name AS restaurant,
  t.name AS tier,
  t.base_price_monthly,
  COUNT(sf.id) AS features_count,
  calculate_subscription_total_price(rs.id) AS monthly_total
FROM restaurant_subscriptions rs
JOIN restaurants r ON r.id = rs.restaurant_id
JOIN tiers t ON t.id = rs.tier_id
LEFT JOIN subscription_features sf ON sf.subscription_id = rs.id AND sf.is_active = true
WHERE rs.active = true
GROUP BY r.name, t.name, t.base_price_monthly, rs.id;
```

### Ver features más populares

```sql
SELECT 
  f.name,
  f.category,
  COUNT(sf.subscription_id) AS subscriptions_count,
  SUM(sf.price_at_purchase) AS total_revenue
FROM subscription_features sf
JOIN features f ON f.id = sf.feature_id
WHERE sf.is_active = true
GROUP BY f.id, f.name, f.category
ORDER BY subscriptions_count DESC;
```

### Revenue mensual estimado

```sql
SELECT 
  SUM(calculate_subscription_total_price(id)) AS monthly_revenue
FROM restaurant_subscriptions
WHERE active = true;
```

---

## 🛡️ Seguridad (RLS)

Las políticas de Row Level Security ya están implementadas:

- **Tiers y Features**: Públicos (todos pueden ver)
- **Suscripciones**: Solo el owner del restaurante
- **Facturas**: Solo el owner del restaurante
- **Admins**: Pueden ver todo

---

## 🚨 Consideraciones Importantes

### 1. Prorrateo

El prorrateo está implementado a nivel de base de datos pero **debes implementar la lógica de cálculo de días** en las funciones SQL o en el backend.

```typescript
// Ejemplo de cálculo de prorrateo
function calculateProration(
  monthlyPrice: number,
  daysRemaining: number,
  totalDaysInMonth: number
): number {
  return (monthlyPrice / totalDaysInMonth) * daysRemaining
}
```

### 2. Impuestos

El sistema tiene un campo `tax` en invoices pero **debes implementar el cálculo según tu país**.

```typescript
// Ejemplo para IVA en España (21%)
const tax = subtotal * 0.21
```

### 3. Cancelación

Cuando un cliente cancela:
- `auto_renew` se pone en `false`
- La suscripción sigue activa hasta `expires_at`
- No se generan más invoices después de esa fecha

### 4. Features Incluidas vs Pagadas

- `tier_features.included_by_default = true`: Gratis con el tier
- `tier_features.included_by_default = false`: Cliente debe pagarla
- Si no está en `tier_features`: Precio completo sin descuento

---

## 🧪 Testing

### Crear suscripción de prueba

```typescript
// 1. Crear restaurant de prueba
const { data: restaurant } = await supabase.from('restaurants').insert({
  name: 'Test Restaurant',
  slug: 'test-restaurant',
  owner_id: 'user-uuid'
}).select().single()

// 2. Crear suscripción
const subscriptionId = await subscriptionService.createSubscription({
  restaurant_id: restaurant.id,
  tier_id: 2, // Basic
  feature_ids: [1, 5] // pdf_export, unlimited_images
})

// 3. Ver resultado
const subscription = await subscriptionService.getSubscriptionWithPricing(subscriptionId)
console.log(subscription)
```

---

## 📞 Soporte

Para preguntas o problemas con el sistema de suscripciones:

1. Revisar logs de Supabase
2. Verificar políticas de RLS
3. Comprobar que las funciones SQL se ejecutaron correctamente
4. Revisar el historial en `subscription_changes`

---

## 🎉 ¡Listo!

Ahora tienes un sistema completo de suscripciones modulares que te permite:

✅ Ofrecer 3 tiers base con precios flexibles  
✅ Agregar features modulares a cualquier tier  
✅ Calcular precios dinámicamente con descuentos  
✅ Gestionar facturación automática  
✅ Trackear cambios y ajustes  
✅ Cancelar y reactivar suscripciones  
✅ Escalar agregando nuevas features sin cambiar código

**Próximos pasos sugeridos:**
1. Integrar con Stripe/PayPal para pagos reales
2. Implementar lógica de prorrateo detallada
3. Crear dashboard de admin para gestionar tiers y features
4. Agregar notificaciones por email en cambios de suscripción
5. Implementar sistema de descuentos y cupones
