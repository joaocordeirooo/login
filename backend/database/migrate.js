import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pool from "../src/config/database.js";

const arquivoAtual = fileURLToPath(import.meta.url);
const diretorioAtual = path.dirname(arquivoAtual);

async function executarMigrations() {
    const cliente = await pool.connect();

    try {
        const pastaMigrations = path.join(diretorioAtual, "migrations");

        const arquivos = await fs.readdir(pastaMigrations);

        const migrations = arquivos
            .filter((arquivo) => arquivo.endsWith(".sql"))
            .sort();

        await cliente.query(`
            CREATE TABLE IF NOT EXISTS migrations (
                id BIGSERIAL PRIMARY KEY,
                nome_arquivo VARCHAR(255) NOT NULL UNIQUE,
                executada_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `);

        for (const arquivo of migrations) {
            const migrationExecutada = await cliente.query(
                "SELECT 1 FROM migrations WHERE nome_arquivo = $1",
                [arquivo]
            );

            if (migrationExecutada.rowCount > 0) {
                console.log(`Migration já executada: ${arquivo}`);
                continue;
            }

            const caminhoArquivo = path.join(pastaMigrations, arquivo);
            const sql = await fs.readFile(caminhoArquivo, "utf8");

            console.log(`Executando migration: ${arquivo}`);

            await cliente.query("BEGIN");

            try {
                await cliente.query(sql);

                await cliente.query(
                    "INSERT INTO migrations (nome_arquivo) VALUES ($1)",
                    [arquivo]
                );

                await cliente.query("COMMIT");

                console.log(`Migration concluída: ${arquivo}`);
            } catch (erro) {
                await cliente.query("ROLLBACK");
                throw erro;
            }
        }

        console.log("Todas as migrations foram executadas.");
    } catch (erro) {
        console.error("Erro ao executar migrations:", erro);
        process.exitCode = 1;
    } finally {
        cliente.release();
        await pool.end();
    }
}

executarMigrations();