import { useContext } from "react";

import { ThemeContext } from "@/contexts/theme-context";

export function useTheme() {
    const contexto = useContext(ThemeContext);

    if (!contexto) {
        throw new Error(
            "useTheme precisa ser utilizado dentro do ThemeProvider.",
        );
    }

    return contexto;
}