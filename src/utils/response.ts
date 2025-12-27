import type { Response } from 'express';
import type { ApiResponse } from '@/types';

/**
 * Respuestas estandarizadas de la API
 */
export class ApiResponseUtil {
  static success<T>(res: Response, data: T, message?: string, statusCode: number = 200) {
    const response: ApiResponse<T> = {
      success: true,
      data,
      ...(message && { message }),
    };
    return res.status(statusCode).json(response);
  }

  static created<T>(res: Response, data: T, message?: string) {
    return this.success(res, data, message, 201);
  }

  static error(res: Response, message: string, statusCode: number = 500) {
    const response: ApiResponse = {
      success: false,
      error: message,
    };
    return res.status(statusCode).json(response);
  }

  static badRequest(res: Response, message: string) {
    return this.error(res, message, 400);
  }

  static unauthorized(res: Response, message: string = 'No autorizado') {
    return this.error(res, message, 401);
  }

  static forbidden(res: Response, message: string = 'Acceso denegado') {
    return this.error(res, message, 403);
  }

  static notFound(res: Response, message: string = 'Recurso no encontrado') {
    return this.error(res, message, 404);
  }
}
