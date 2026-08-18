import bcrypt from "bcrypt";
import usuarioModel from "../model/usuarioModel.js";
import jwtConfig from "../config/jwt.js"
import jwt from "jsonwebtoken"

async function cadastrarUsuario(req, res) {
        try{
            const {nome, email, senha, perfil} = req.body;
            
                if (!nome || !email || !senha) {
                    return res.status(400).json({
                        sucesso: false, 
                        mensagem: "Nome, email e senha são obrigatórios",
                    });
                }
        
            const nomeLimpo = nome.trim(); //remover espaços
            const emailNormalizado = email.trim().toLowerCase() //deixar o e-mail tudo minusculo

                if (nomeLimpo.length < 3) {
                    return res.status(400).json({
                        sucesso: false, 
                        mensagem: "O nome deve possuir pelo meno 3 caracteres",
                    });
                }

                if (senha.length < 8) {
                    return res.status(400).json({
                        sucesso: false,
                        mensagem: "A senha deve possuir pelo menos 8 caracteres.",
                    })
                }

            const saltRounds = 12; 
            const senhaHash = await bcrypt.hash(senha, saltRounds);

            const novoUsuario = await usuarioModel.criarUsuario({
                nome: nomeLimpo, 
                email: emailNormalizado,
                senhaHash, 
                perfil,
            });
            
            return res.status(201).json({
                sucesso: true,
                mensagem: "Usuario cadastrado com sucesso.",
                usuario: novoUsuario,
            })
        } catch (erro) {
            console.error("Erro ao cadastrar usuário: ", erro);
         
            if (erro.code === "23505"){
                return res.status(409).json({
                    sucesso: false, 
                    mensagem: "Já existe um usuário cadastrado com esse e-mail",
                });
            }

        return res.status(500).json({
            sucesso: false,
            mensagem: "Erro interno ao cadastraru usuário.",
        })
        }
}

async function login(req, res) {
    const {email, senha} = req.body;
   
    try{
        const usuario = await usuarioModel.autenticarUsuario(email, senha);

        const token = jwt.sign({ 
            id: usuario.id, 
            email: usuario.email, 
            role: usuario.perfil},
            jwtConfig.secret, {expiresIn: jwtConfig.expiresIn}
        );

        res.json({
            message: 'login realizado',
            token, 
            usuario
        });
    } catch(err){
        console.error(err);
        res.status(err.status || 500).json({error: err.message || 'Erro ao realizar login'});
    }
};

export default {
    cadastrarUsuario,
    login
};