export function getCssVarFromTheme(varName) {
    const themeRoot = document.querySelector('body.light-mode') || document.querySelector('body.dark-mode');
    if (!themeRoot) return null;
    const value = getComputedStyle(themeRoot).getPropertyValue(varName);
    return value?.trim();
}
