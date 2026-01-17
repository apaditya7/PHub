export const config = {
  port: Number(process.env.PORT) || 3001, // Monopoly backend runs on port 3001
  cors: {
    origin: process.env.CORS_ORIGIN?.split(",").map(s => s.trim()) || ["http://localhost:3000", "http://localhost:5173"],
    credentials: true
  }
};

