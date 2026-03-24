import { z } from 'zod';
import { AppError } from './errorHandler.js';

/**
 * Validate request data against a Zod schema
 */
export const validate = (schema) => {
  return (req, res, next) => {
    try {
      const validatedData = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      // Replace request data with validated data
      if (validatedData.body) req.body = validatedData.body;
      if (validatedData.query) Object.assign(req.query, validatedData.query);
      if (validatedData.params) Object.assign(req.params, validatedData.params);

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        return next(
          new AppError(
            `Validation error: ${errors.map((e) => e.message).join(', ')}`,
            400
          )
        );
      }
      next(error);
    }
  };
};

/**
 * Common validation schemas
 */
export const commonSchemas = {
  // MongoDB ObjectId
  objectId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format'),

  // Email
  email: z.string().email('Invalid email address'),

  // Password (min 8 chars, at least 1 uppercase, 1 lowercase, 1 number)
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),

  // Phone number (basic validation)
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number'),

  // Date
  date: z.string().datetime().or(z.date()),

  // Pagination
  pagination: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
};
