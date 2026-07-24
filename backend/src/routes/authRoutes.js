import { Router } from "express";

const router = Router();

/**post /api/auth/login */

router.post("/login", (req, res) => {
    const { email, senha } = req.body;

    //validação

    if (!email || !senha) {
        return res.status(400).json({
            sucesso: false, 
            mensagem: "Informe o e-mail e a senha."
        });
    }

    //simulação de autenticação
    if(email === "admin@apliq.com" && senha === "123456") {
        return res.status(200).json({
            sucesso: true, 
            mensagem: "login realizado com sucesso", 
            token: "jwt_teste_123456",
            usuario: {
                id: 1, 
                nome: "administrador",
                email
            }
        });
    }

    return res.status(401).json({
        sucesso: false, 
        mensagem: "email ou senha invalidos"
    });
});

export default router;