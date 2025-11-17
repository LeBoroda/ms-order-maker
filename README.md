# MS Order Maker

Online order tool based on MoySklad API. Fetches available stock, allows authorized users to create orders, and sends email notifications to the sales department.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file in the root directory (copy from `.env.example`):

```bash
cp .env.example .env
```

3. Configure environment variables in `.env`:
   - `VITE_MOYSKLAD_TOKEN` - MoySklad API token for authentication
   - `VITE_ORDER_NOTIFICATION_EMAIL` - Email address to receive order notifications

**Important:** 
- The `.env` file is gitignored and should never be committed to version control. Use `.env.example` as a template.
- **After creating or modifying the `.env` file, you must restart the development server** (`npm run dev`) for the changes to take effect. Vite only loads environment variables at startup.
- The API token is stored securely in the `.env` file and is never exposed in the client-side code bundle.

## Development

```bash
npm run dev
```

## Testing

```bash
npm test
```

## Linting

```bash
npm run lint:fix
```

## Security Notes

- Never commit `.env` files containing real credentials
- The `.env.example` file contains placeholder values only
- Credentials are stored locally and read at runtime via environment variables

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x';
import reactDom from 'eslint-plugin-react-dom';

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```
