import {ZodType, ZodError} from "zod";
import {Request, Response, NextFunction} from "express";
import {errorHandler} from "@middleware/errorHandler";

export enum ValidationSource {
    BODY = "body",
    QUERY = "query",
    HEADER = "headers",
    PARAM = "params"
}

/**
 * Creates middleware that parses a request property and copies the parse result onto it.
 * It calls `next` even when parsing reports invalid input. A thrown ZodError receives
 * a 400 response; other caught errors are swallowed.
 * @param source - Request property to parse: body, query, headers, or params.
 */
export const validateRequest = (schema:ZodType, source: ValidationSource) => {
    return (req:Request, res: Response, next: NextFunction) => {
        try {
            const data = schema.safeParse(req[source]);
            Object.assign(req[source], data);
            next();//call next function
        }
        catch(err) {
            if(err instanceof ZodError) {
                return errorHandler(err, req, res.status(400), next); //TODO: Update error handling
            }
        }
    }
}
