import LoginForm from "../components/login/LoginForm";

export default function Login() {
  return (
     <main
  className="
    relative min-h-dvh
    bg-cover bg-no-repeat
    bg-position:30%_center
    sm:bg-position:40%_center
    lg:bg-center
  "
  style={{
    backgroundImage: "url('/images/login-background.png')",
  }}
>
  <div
    className="
      absolute inset-0
      bg-white/35
      sm:bg-white/20
      lg:bg-transparent
    "
  />


      {/* Conteúdo */}
      <div
        className="
          relative z-10
          flex min-h-screen
          items-center justify-center
          px-4 py-8

          sm:px-8

          lg:justify-end
          lg:px-16

          xl:px-28
        "
      >
        <div className="flex w-full max-w-md flex-col items-center">
          <header className="mb-7 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">
              FORENTIS.ADV
            </h1>

            <p className="mt-1 text-sm text-zinc-700">
              Seu novo conceito de escritório
            </p>
          </header>

          <section
            className="
              w-full
              rounded-3xl
              border border-white/60
              bg-white/90
              p-6
              shadow-[0_20px_50px_rgba(0,0,0,0.28)]
              backdrop-blur-md

              sm:p-8
            "
          >
            <div className="mb-7 text-center">
              <h2 className="text-xl font-bold text-zinc-900">
                Entrar na sua conta
              </h2>

              <p className="mt-2 text-sm text-zinc-500">
                Informe seu e-mail e sua senha para continuar
              </p>
            </div>

            <LoginForm />
          </section>

          <footer className="mt-8 text-center text-xs font-medium text-zinc-600">
            © 2026 APLIQ TECNOLOGIA. Todos os direitos reservados.
          </footer>
        </div>
      </div>
    </main>
  );
}