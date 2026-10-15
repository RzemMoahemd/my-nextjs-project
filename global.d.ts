// Déclarations de modules pour les imports « side-effect » de styles.
// Nécessaire pour que TypeScript / VS Code accepte `import "./globals.css"`.
declare module "*.css";
declare module "*.scss";
declare module "*.module.css" {
  const classes: { readonly [key: string]: string };
  export default classes;
}
