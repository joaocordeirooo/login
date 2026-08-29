import { useState } from "react";

export default function LoginFOrm() {
    
    const [email, setEmail] = useState(""); 
    const [senha, setSenha] = useState("");
    const [manterConectado, setManterConectado] = useState(false);
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState("");

    const handleSubmit = async (event) => {
        event.preventDefault();

        setCarregando(true);
        setErro("")

        try{
            const resposta = await fetch(
                "http://localhost:3000/api/usuarios/login",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        email: email.trim().toLowerCase(),
                        senha,
                    }),
                }
            );

            const resultado = await resposta.json(); 

            if(!resposta.ok) {
                throw new Error(
                    resultado.message || "não foi possível realizar o login"
                );
            }

            const token = resultado.token;
            const usuario = resultado.usuario; 

            if(!token) {
                throw new Error("O servidor não retornou token de acesso.");
            }

            const armazenamento = manterConectado
                ? localStorage
                : sessionStorage;

            armazenamento.setItem("token", token);
            armazenamento.setItem(
                "usuario",
                JSON.stringify(usuario)
            );

            console.log("LOGIN REALIZADO COM SUCESSO!");
            console.log("usuario autenticado: ", usuario);
        } catch (erro) {
            setErro(
                erro.message || "Erro inesperado ao realizar login."
            );
        } finally {
            setCarregando(false);
        }
    };

    return (
        <form
            className="flex w-full flex-col gap-5"
            onSubmit={handleSubmit}
        >
            <div className="flex flex-col gap-2">
                <label
                    className="text-sm font-semibold text-zinc-800"
                    htmlFor="email"
                >
                E-mail
                </label>    

                <input 
                    required 
                    autoComplete="email"
                    className="
                    w-full rounded-lg border border-zinc-300
                    bg-white px-4 py-3 text-zinc-900 outline-none
                    transition
                    placeholder:text-zinc-400
                    focus:border-blue-600
                    focus:ring-4 focus:ring-blue-600/15
                    "
                    id="email"
                    name="email"
                    placeholder="seuemail@exemplo.com"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                />
            </div>

            <div className="flex flex-col gap-2">
                <label
                    className="text-sm font-semibold text-zinc-800"
                    htmlFor="senha"
                >
                    Senha
                </label>   
                <input 
                    required 
                    autoComplete="current-password"
                    className="
                        w-full rounded-lg border border-zinc-300
                        bg-white px-4 py-3 text-zinc-900 outline-none
                        transition 
                        placeholder:text-zinc-400
                        focus:border-blue-600
                        focus:ring-4 focus:ring-blue-600/15
                    "    
                    id="senha"
                    name="senha"
                    placeholder="Digite sua senha"
                    type="password"
                    value={senha}
                    onChange={(event) => setSenha(event.target.value)}
                />
            </div>

            <div className="flex flex-col gap-2 text=sm sm:flex-row sm:items-center sm:justify-between">
                <label className="flex cursor-pointer items-center gap-2 text-zinc-600">
                    <input
                        checked={manterConectado}
                        className="size-4 accent-blue-700"
                        name="manterConectado"
                        type="checkbox"
                        onChange={(event) =>
                            setManterConectado(event.target.checked)
                        }
                    />
                    Manter-me conectdo
                </label>
                
                <a
                    className="font-medium text-blue-700 hover:underline"
                    href="/esqueci-minha-senha"
                >
                    Esqueci minha senha
                </a>
            </div>

            {erro && (
                <div
                    className="rounded-lg border-red-200 bg-red-50 px-4 text-sm text-red-700"
                    role="alert"
                >
                    {erro}
                </div>
            )}

            <button
                disabled={carregando}
                className="mt-4 w-full rounded-lg bg-blue-700
                px-4 py-3 font-semibold text-white
                transition
                hover:bg-blue-800
                focus:outline-none
                focus:ring-4 focus:ring-blue-700/2025
                active:scale-[0.99]"

                type="submit"
            >
                {carregando ? "Entrando..." : "Entrar"}
            </button>
        </form>
    );
}