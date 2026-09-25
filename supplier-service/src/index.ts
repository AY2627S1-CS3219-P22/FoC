//This is where the express server lives for local testing

import dotenv from 'dotenv';
import express from "express";
import supplierRouter from "@api/router";
import errorHandler from "@middleware/errorHandler";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

//Middleware
app.use(express.json());

const router = supplierRouter

app.use(router);
//Error handling middleware
app.use(errorHandler);

//Server running
app.listen(port, () => {
    console.log(`Supplier Service is running locally on port ${port}`)
})

