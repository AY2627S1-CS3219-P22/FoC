import {ZodType, ZodError} from "zod";
import {Request, Response, NextFunction} from "express";
import {errorHandler} from "@middleware/errorHandler";

export enum ValidationSource {
    BODY = "body",
    QUERY = "query",
    HEADER = "headers",
    PARAM = "params"
}

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
