import "dotenv/config";
import express from "express";
import cors from "cors";
import usuarioRoutes from "./routes/usuarioRoutes.js"

import pool from "./config/database.js";
import authRoutes from "./routes/authRoutes.js";

const app = express();

const PORT = process.env.PORT || 3000;

app.use(
    cors({
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        credentials: true
    })
);

app.use(express.json());

// Rotas de autenticação
app.use("/api/auth", authRoutes);

// Rota principal
app.get("/", (req, res) => {
    return res.status(200).json({
        message: "Um beijo para a Gabi, a mais linda de Fraiburgo."
    });
});

//ROTA DE USUARIO 
app.use("/api/usuarios", usuarioRoutes);

// Status da API
app.get("/api/status", (req, res) => {
    return res.status(200).json({
        online: true,
        application: "API da aplicação funcionando",
        timestamp: new Date().toISOString()
    });
});

// Teste do PostgreSQL
app.get("/api/database/test", async (req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT
                NOW() AS data_hora,
                current_database() AS banco,
                current_user AS usuario
        `);

        return res.status(200).json({
            sucesso: true,
            mensagem: "Conexão com o PostgreSQL funcionando.",
            dados: resultado.rows[0]
        });
    } catch (erro) {
        console.error("Erro ao testar banco:", erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: "Não foi possível conectar ao PostgreSQL.",
            erro: erro.message,
            codigo: erro.code
        });
    }
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor executando na porta ${PORT}`);
});