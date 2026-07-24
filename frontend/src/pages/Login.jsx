 import { useState } from "react";

 function Login(){
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");

    function handleLogin(event){
        event.preventDefault();

        console.log("email:", email); 
        console.log("senha:", senha);

        alert("login simulado com sucesso!")
    }
    return (
        <div className="min-h-screen bg-zinc-900 flex items-center justify-center px-4">
            <div className="w-full max-w-md bg-zinc-800 rounded-2x1 shadow-lg p-8">
                <h1 className="text-3x1 font-bold text-white text-center mb-2">
                
                    Login
                </h1>

                <p className="text-zinc-400 text-center mb-8">
                    Acesse sua conta para continuar
                </p>

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="block text-zinc-300 mb-2">
                            E-mail
                        </label>

                        <input
                        type="email"
                        placeholder="Digite seu e-mail"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className="w-full px-4 py-3 rounded-lg bg-zinc-700 text-white outline-none border border-zinc-600 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-zinc-300 mb-2">
                            Senha
                        </label>

                        <input
                        type="password"
                        placeholder="Digite sua senha"
                        value={senha}
                        onChange={(event) => setSenha(event.target.value)}
                        className="w-full px-4 py-3 rounded-lg bg-zinc-700 text-white outline-none border border-zinc-600 focus:border-blue-500"
                        />
                    </div>

                    <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition"
                    >
                        Entrar
                    </button>
                </form>

                <p className="text-zinc-400 text-center mt-6 text-sm">
                    Ainda não tem conta?{""}
                    <span className="text-blue-400 text-center mt-6 text-sm">
                        Cadastre-se
                    </span>
                </p>
            </div>
            
        </div>
    )
 }


 export default Login;