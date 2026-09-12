import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";

export function ThemeToggle() {
    const { tema, alternarTema } = useTheme();

    const modoEscuro = tema === "dark";

    return (
        <Button
            aria-label={
                modoEscuro
                    ? "Ativar modo claro"
                    : "Ativar modo escuro"
            }
            size="icon"
            title={
                modoEscuro
                    ? "Ativar modo claro"
                    : "Ativar modo escuro"
            }
            variant="ghost"
            onClick={alternarTema}
        >
            {modoEscuro ? (
                <Sun className="size-5" />
            ) : (
                <Moon className="size-5" />
            )}
        </Button>
    );
}