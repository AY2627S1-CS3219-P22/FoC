//This is where the express server lives
//To export app for local testing app.ts was created

import dotenv from 'dotenv';
import { app } from '@/app';

dotenv.config();

const port = process.env.PORT || 3001; //local .env configuration

//Server running
app.listen(port, () => {
    console.log(`Supplier Service is running locally on port ${port}`)
})
