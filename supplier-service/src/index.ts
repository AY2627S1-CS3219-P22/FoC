import dotenv from 'dotenv';
import express from "express";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

//Middleware
app.use(express.json());

//Routes

//Error handling middleware

//Server running
app.listen(port, () => {
    console.log(`Supplier Service is running locally on port ${port}`)
})

