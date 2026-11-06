// AI-assisted (Claude), reviewed and tested by Maliha
function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set (see .env.example)`);
  return value;
}

export const env = {
  PORT: Number(process.env.PORT ?? 3005),
  DATABASE_URL: required('DATABASE_URL'),
  USER_SERVICE_PUBLIC_KEY_PATH: required('USER_SERVICE_PUBLIC_KEY_PATH'),
  ORDER_SERVICE_URL: process.env.ORDER_SERVICE_URL ?? 'http://localhost:3003',
};