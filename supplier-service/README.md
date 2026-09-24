# Database Connection
- The Database has been set up using a Supabase connection on IPv4
- To connect to the database on your local computer and run the tests please set up a .env file with the following mandatory environment variables
    - DATABASE_URL:
    - DATABASE_PASSWORD:
    - PORT:
    
All database connection details can be found in 
 `supplier_service/src/database/db.ts`
 `supplier_service/tests/db/db.integration.tests.ts`

To run tests in the db folder which include db integration tests run
`yarn test:db`

TODO: Set up docker secrets for seamless deployment across different devices

# CRUD Database Operations


