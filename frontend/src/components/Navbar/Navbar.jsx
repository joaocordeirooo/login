function Navbar() {
  return (
    <div className="absolute top-4 left-1/2 z-20 w-[90%] max-w-6xl -translate-x-1/2">
      <nav className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/60 px-5 py-3 shadow-xl backdrop-blur-xl">
        
        <div className="text-lg font-semibold text-white">
          Apliq
        </div>

        <div className="hidden items-center gap-8 md:flex">
          <a
            href="#"
            className="text-sm text-white/60 transition hover:text-white"
          >
            Início
          </a>

          <a
            href="#"
            className="text-sm text-white/60 transition hover:text-white"
          >
            Sobre
          </a>
        </div>

        <button className="rounded-xl bg-white px-5 py-2 text-sm font-semibold text-black transition hover:bg-white/90">
          Entrar
        </button>
      </nav>
    </div>
  )
}

export default Navbar