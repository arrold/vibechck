# Releasing Vibechck

## 1. Versioning Strategy

**Should I start with 1.0.0?**

- **0.0.1 / 0.1.0**: recommended for initial releases. It tells users "this is new, APIs might change, give feedback".
- **1.0.0**: implies a stable, production-ready release with a commitment to semantic versioning (no breaking changes without 2.0.0).

Since `vibechck` is achieving its first public release, starting with **0.1.0** is a strong choice. It signals "functional and ready for use" without the strict guarantees of 1.0.0 yet.

## 2. Prerequisites

1.  **NPM Account**: You need an account on [npmjs.com](https://www.npmjs.com/).
2.  **Login**: Run this command locally and follow the prompts:
    ```bash
    npm login
    ```

## 3. Publishing Steps

1.  **Bump Version**:
    Update the version number in `package.json` and create a git tag automatically.
    ```bash
    # For a minor release (0.1.0)
    npm version minor
    
    # OR for a patch (0.0.2)
    npm version patch
    ```

2.  **Publish**:
    This will automatically run `npm run build`, `npm test`, and `npm run lint` before uploading.
    ```bash
    npm publish
    ```

    *Note: If the name `vibechck` is taken (unlikely, we checked), you may need to scope it (e.g., `@yourname/vibechck`) in `package.json`.*

4.  **Handling 2FA** (If enabled):
    Most accounts have Two-Factor Authentication (2FA) enabled for publishing.
    
    *   **Option A: Manual OTP (Simplest)**
        Find the code in your authenticator app and run:
        ```bash
        npm publish --otp=123456
        ```
    
    *   **Option B: Automation Token (Set & Forget)**
        1. Go to NPM Website -> Access Tokens -> Generate New Token -> Granular Access Token.
        2. Set permissions to "Read and write packages" for this package.
        3. **Important**: Select "Skip 2FA for write operations".
        4. Create a `.npmrc` file (add to `.gitignore`!) with:
           ```
           //registry.npmjs.org/:_authToken=your_token_here
           ```

3.  **Verification**:
    Check [npmjs.com/package/vibechck](https://www.npmjs.com/package/vibechck) to see your package live!
