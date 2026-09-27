import {ZodType} from "zod";
import {Request, Response, NextFunction} from "express";
import {errorHandler} from '@middleware/error-handler'

export enum ValidationSource {
    BODY = "body",
    QUERY = "query",
    HEADER = "headers",
    PARAM = "params"
}

export const validateRequest = (schema:ZodType, source: ValidationSource) => {
    return (req:Request, res: Response, next: NextFunction) => {
        const result = schema.safeParse(req[source]);
        if (!result.success) {
            return errorHandler(result.error, req, res.status(400), next);
        }
        req[source] = result.data;
+       next();//call next function
    }
}
