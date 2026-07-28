import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
});

pool.on("connect", () => {
    console.log("PostgreSQL conectado.")
});

pool.on("error", (erro) => {
    console.error("Erro inesperado no PostgreSQL:", erro);
});

export default pool;

