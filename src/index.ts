import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from '@/config/env';
import router from '@/routes';
import { errorHandler, notFoundHandler } from '@/middleware/errorHandler';

const app = express();

// Middlewares de seguridad
app.use(helmet());
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
}));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging en desarrollo
if (env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
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
