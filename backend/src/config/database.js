import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT, 
    database: process.env.DB_NAME, 
    user: process.env.DB_USER, 
    password: String(process.env.DB_PASSWORD),
    ssl: false
});

pool.connect((err, client, release) => {
    if(err){
        console.error('Erro ao se conectar com o BD: ', err.stack)
    } else{
        console.log('Conexão feita com sucesso');
        release(); 
    }
});

export default pool;

