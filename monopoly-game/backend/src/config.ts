export const config = {
  port: Number(process.env.PORT) || 4000,
  cors: {
    origin: process.env.CORS_ORIGIN?.split(",").map(s => s.trim()) || ["*"],
    credentials: true
  }
};

