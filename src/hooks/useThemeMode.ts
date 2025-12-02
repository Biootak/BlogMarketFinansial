import { useEffect } from "react";
import { createGlobalState } from "react-hooks-global-state";

const initialState = { isDarkmode: false };
const { useGlobalState } = createGlobalState(initialState);

export const useThemeMode = () => {
  const [isDarkMode, setIsDarkMode] = useGlobalState("isDarkmode");

  useEffect(() => {
    // Default to light theme if no preference is set
    if (localStorage.theme === "dark") {
      toDark();
    } else {
      toLight();
      // Ensure light is set as default in localStorage
      if (!localStorage.theme) {
        localStorage.theme = "light";
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toDark = () => {
    setIsDarkMode(true);
    const root = document.querySelector("html");
    if (!root) return;
    !root.classList.contains("dark") && root.classList.add("dark");
    localStorage.theme = "dark";
  };

  const toLight = () => {
    setIsDarkMode(false);
    const root = document.querySelector("html");
    if (!root) return;
    root.classList.remove("dark");
    localStorage.theme = "light";
  };

  function _toogleDarkMode() {
    if (localStorage.theme === "light") {
      toDark();
    } else {
      toLight();
    }
  }

  return {
    isDarkMode,
    toDark,
    toLight,
    _toogleDarkMode,
  };
};
