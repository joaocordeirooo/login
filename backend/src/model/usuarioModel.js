import pool from '../config/database.js'
import bcrypt from 'bcrypt'


async function criarUsuario({nome, email, senhaHash, perfil = "usuario"}) {
    const query = `
        INSERT INTO usuarios (
            nome, 
            email,
            senha_hash, 
            perfil
        )
        VALUES ($1, $2, $3, $4)        
        RETURNING 
            id,
            nome,
            email,
            perfil,
            ativo,
            criado_em,
            atualizado_em
        `;

        const valores = [nome, email, senhaHash, perfil];

        const resultado = await pool.query(query, valores);

        return resultado.rows[0];
}

async function autenticarUsuario(email, senha) {
        const query = `
            SELECT id, nome, email, senha_hash, perfil FROM usuarios WHERE email = $1 AND ativo = true`;

        const result = await pool.query(query, [email]);

        if (result.rowCount === 0) {
            throw{status: 401, 
                message: 'Usuário não encontrado ou inativo'
            };
        }

        const usuario = result.rows[0];

        const senhaValida = await bcrypt.compare(
            senha, 
            usuario.senha_hash
        );
        if (!senhaValida){
            throw {
                status: 401, 
                message: 'Senha Inválida'
            };
        }

        return {
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            perfil: usuario.perfil
        }
};



export default {
    criarUsuario,
    autenticarUsuario
}


