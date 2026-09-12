import { useEffect, useState } from "react";
import PropTypes from "prop-types";

import { ThemeContext } from "@/contexts/theme-context";

export function ThemeProvider({ children }) {
    const [tema, setTema] = useState(() => {
        return localStorage.getItem("tema") || "light";
    });

    useEffect(() => {
        const elementoHtml = document.documentElement;

        elementoHtml.classList.toggle(
            "dark",
            tema === "dark",
        );

        localStorage.setItem("tema", tema);
    }, [tema]);

    const alternarTema = () => {
        setTema((temaAtual) =>
            temaAtual === "light" ? "dark" : "light",
        );
    };

    return (
        <ThemeContext.Provider
            value={{
                tema,
                setTema,
                alternarTema,
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
}

ThemeProvider.propTypes = {
    children: PropTypes.node.isRequired,
};