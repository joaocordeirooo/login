import Beams from "@/components/Beams/Beams"
import Navbar from "@/components/Navbar/Navbar"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function Login() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden">

      {/* BACKGROUND */}
      <div className="absolute inset-0">
        <Beams
          beamWidth={2.9}
          beamHeight={30}
          beamNumber={20}
          lightColor="#0732dc"
          speed={2}
          noiseIntensity={1.75}
          scale={0.2}
          rotation={30}
        />
      </div>

      {/* NAVBAR */}
      <Navbar />

      {/* LOGIN */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 pt-24">

        <Card className="w-full max-w-sm border-white/20 bg-white/90 text-slate-900 shadow-2xl backdrop-blur-xl">

          <CardHeader>
            <CardTitle className="text-slate-900">
              Entrar na sua conta
            </CardTitle>

            <CardDescription className="text-slate-600">
              Informe seu e-mail e senha para continuar.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form>
              <div className="flex flex-col gap-6">

                {/* EMAIL */}
                <div className="grid gap-2">
                  <Label htmlFor="email">
                    E-mail
                  </Label>

                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    required
                  />
                </div>

                {/* SENHA */}
                <div className="grid gap-2">

                  <div className="flex items-center">
                    <Label htmlFor="password">
                      Senha
                    </Label>

                    <a
                      href="#"
                      className="ml-auto text-sm text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline"
                    >
                      Esqueci minha senha
                    </a>
                  </div>

                  <Input
                    id="password"
                    type="password"
                    required
                  />

                </div>

              </div>

              {/* BOTÃO */}
              <Button
                type="submit"
                className="mt-6 w-full"
              >
                Entrar
              </Button>

            </form>
          </CardContent>

        </Card>

      </div>

    </div>
  )
}

export default Login