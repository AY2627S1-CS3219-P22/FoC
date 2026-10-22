//This is where the express server lives
//To export app for local testing app.ts was created

//imports are evaluated before the module body, so .env must load from an import
//rather than a dotenv.config() call below: app pulls in modules that read env at import time
import 'dotenv/config';
import { app } from '@/app';

const port = Number(process.env.PORT || 3002);
const host = process.env.HOST || '0.0.0.0';

app.listen(port, host, () => {
    console.log(`Supplier Service is running on ${host}:${port}`)
})
