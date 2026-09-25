//Error handling middleware for supplier service
//AI DECLARATION: Aided by autocomplete from Cursor
//TODO: Implement proper error handling middleware, not just for local development :) 

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

/**
 * Responds to Zod errors with status 400 and their issues in JSON.
 * Other errors receive status 500 with a `Something broke!` response.
 */
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof ZodError) {
        return res.status(400).json({
            message: 'Validation failed',
            errors: err.issues,
        });
    }

    console.log(err.stack);
    res.status(500).send('Something broke!');
}

export default errorHandler;
