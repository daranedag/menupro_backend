import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from '@/config/env';
import router from '@/routes';
import { errorHandler, notFoundHandler } from '@/middleware/errorHandler';

const app = express();

// Lista de orígenes permitidos (soporta coma separada en .env)
const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean);
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) return callback(null, true); // requests sin origin (curl, herramientas) permitidas
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
};

// Middlewares de seguridad
app.use(helmet());
app.use(cors(corsOptions));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging en desarrollo (solo método y path, sin headers sensibles)
if (env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    next();
  });
}

// Rutas de la API
app.use('/api', router);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: env.APP_NAME,
    version: '1.0.0',
    status: 'running',
    environment: env.NODE_ENV,
  });
});

// Manejadores de errores
app.use(notFoundHandler);
app.use(errorHandler);

// Iniciar servidor
const PORT = parseInt(env.PORT);
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════╗
║                                           ║
║   🚀 ${env.APP_NAME} API                    ║
║                                           ║
║   Environment: ${env.NODE_ENV.padEnd(22)}    ║
║   Port: ${PORT.toString().padEnd(31)}    ║
║   URL: ${env.APP_URL.padEnd(32)}    ║
║                                           ║
║   ✅ Server is running!                   ║
║                                           ║
╚═══════════════════════════════════════════╝
  `);
});

// Manejo de señales para shutdown graceful
process.on('SIGTERM', () => {
  console.log('SIGTERM recibido, cerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT recibido, cerrando servidor...');
  process.exit(0);
});
