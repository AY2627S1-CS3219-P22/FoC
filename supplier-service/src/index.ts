//This is where the express server lives
//To export app for local testing app.ts was created

//imports are evaluated before the module body, so .env must load from an import
//rather than a dotenv.config() call below: app pulls in modules that read env at import time
import 'dotenv/config';
import { app } from '@/app';

const port = process.env.PORT || 3001; //local .env configuration

//Server running
app.listen(port, () => {
    console.log(`Supplier Service is running locally on port ${port}`)
})
