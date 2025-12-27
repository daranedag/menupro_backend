import type { Request, Response, NextFunction } from 'express';
import { AppError } from '@/types';
import { env } from '@/config/env';

/**
 * Middleware global de manejo de errores
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Si ya se envió la respuesta, delegar al manejador por defecto
  if (res.headersSent) {
    return next(err);
  }

  // Log del error en desarrollo
  if (env.NODE_ENV === 'development') {
    console.error('❌ Error:', err);
  }

  // Error operacional conocido
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      ...(env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  }

  // Error desconocido
  const statusCode = 500;
  const message =
    env.NODE_ENV === 'development'
      ? err.message
      : 'Error interno del servidor';

  return res.status(statusCode).json({
    success: false,
    error: message,
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

/**
 * Middleware para rutas no encontradas
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const error = new AppError(
    `Ruta no encontrada: ${req.method} ${req.path}`,
    404
  );
  next(error);
};

/**
 * Wrapper async para rutas que previene errores no capturados
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
