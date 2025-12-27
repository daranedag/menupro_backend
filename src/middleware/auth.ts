import type { Response, NextFunction } from 'express';
import { supabase } from '@/config/supabase';
import { AppError, type AuthRequest } from '@/types';

/**
 * Middleware para autenticar usuarios via JWT de Supabase
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Obtener el token del header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Token de autenticación no proporcionado', 401);
    }

    const token = authHeader.substring(7); // Remover "Bearer "

    // Verificar el token con Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      throw new AppError('Token inválido o expirado', 401);
    }

    // Adjuntar usuario a la request
    req.user = user;
    req.userId = user.id;

    next();
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }
    
    return res.status(401).json({
      success: false,
      error: 'Error de autenticación',
    });
  }
};

/**
 * Middleware opcional de autenticación (para rutas públicas que pueden tener usuario autenticado)
 */
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (!error && user) {
        req.user = user;
        req.userId = user.id;
      }
    }
    
    next();
  } catch (error) {
    // En auth opcional, ignoramos errores y continuamos
    next();
  }
};

/**
 * Middleware para verificar rol de usuario
 */
export const requireRole = (roles: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        throw new AppError('Usuario no autenticado', 401);
      }

      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', req.userId)
        .single();

      if (error || !profile) {
        throw new AppError('Perfil de usuario no encontrado', 404);
      }

      if (!roles.includes(profile.role)) {
        throw new AppError('No tienes permisos para realizar esta acción', 403);
      }

      next();
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      }
      
      return res.status(500).json({
        success: false,
        error: 'Error verificando permisos',
      });
    }
  };
};
