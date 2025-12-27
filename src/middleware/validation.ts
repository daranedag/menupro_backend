import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '@/types';

/**
 * Middleware para validar request body, query o params con Zod
 */
export const validate = (schema: z.ZodSchema, source: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req[source];
      const validated = schema.parse(data);
      req[source] = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        
        return res.status(400).json({
          success: false,
          error: 'Datos de entrada inválidos',
          details: errors,
        });
      }
      next(error);
    }
  };
};

/**
 * Validar paginación
 */
export const paginationSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().min(1)).optional().default('1'),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional().default('10'),
});
