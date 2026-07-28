import "dotenv/config";
import express from "express";
import cors from "cors";

import pool from "./config/database.js";

//importação de rotas
import authRoutes from "./routes/authRoutes.js";



const app = express();

const PORT = process.env.PORT || 3000; 

app.use(
    cors({
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
    })
);

app.use(express.json());

//rotas
app.use("/api/auth", authRoutes)


app.get("/api/database/test", async (req, res) => {
    try{
        const resultado = await pool.query(`
            SELECT 
                NOW() AS data_hora,
                current_database() AS banco,
                current_user AS usuario
            `);
        
        res.status(200).json({
            sucesso: true, 
            mensagem: "Conexão com o PostgreSQL funcionando",
            dados: resultado.rows[0]
        });
    } catch (erro) {
        console.error("Erro ao testar bd: ", erro);

        res.status(500).json({
            sucesso: false, 
            mensagem: "não foi possível conectar ao pg",
            erro:
                process.env.NODE_ENV === "development"
                ? erro.message
                : undefined
        });
    }
})


app.get("/", (req, res) => {
    return res.status(200).json({
        message: "um bj p gabi, a mais linda de fraiburgo",
    });
});


app.get("/api/status", (req, res) => {
     return res.status(200).json({
        online: true, 
        application: "API da aplicação funcionando",
        timestamp: new Date().toISOString(),
    });
});

app.get("/api/database/status", async (req, res) => {
    try {
        const resultado = await pool.query(
            "SELECT NOW() AS horario, current_database() AS banco"
        );

        return res.status(200).json({
            sucesso: true, 
            mensagem: "banco de dados conectado",
            dados: resultado.rows[0]
        });
    } catch (erro) {
        console.error("Erro ao consultar banco:", erro);

        return res.status(500).json({
            sucesso: false, 
            mensagem: "não foi possível conectar o bd"
        });
    }
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor executando na porta ${PORT}`);
})


