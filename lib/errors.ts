export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message)
    this.name = this.constructor.name
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'No autenticado') {
    super(message, 401)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Sin permiso') {
    super(message, 403)
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Recurso') {
    super(`${resource} no encontrado`, 404)
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    public readonly issues?: unknown,
  ) {
    super(message, 422)
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409)
  }
}

export function toApiError(err: unknown): { message: string; statusCode: number; issues?: unknown } {
  if (err instanceof ValidationError) {
    return { message: err.message, statusCode: err.statusCode, issues: err.issues }
  }
  if (err instanceof AppError) {
    return { message: err.message, statusCode: err.statusCode }
  }
  return { message: 'Error interno del servidor', statusCode: 500 }
}
