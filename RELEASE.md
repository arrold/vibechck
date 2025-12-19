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

The release process is automated via `package.json` scripts, but requires a clean git state to start.

1.  **Ensure Git is Clean**:
    You **MUST** commit or stash all local changes before releasing. `npm version` will fail if the working directory is not clean.
    ```bash
    git status
    # Should say "nothing to commit, working tree clean"
    ```

2.  **Bump Version**:
    Run one of the following commands. This will automatically:
    - Bump the version in `package.json` and `package-lock.json`
    - Run `lint` and `format`
    - **Commit** the version bump
    - **Tag** the commit
    - **Push** the commit and tags to GitHub (via `postversion` script)

    ```bash
    # For a patch release (e.g., 0.2.6 -> 0.2.7) - Use this for bug fixes
    npm version patch
    
    # For a minor release (e.g., 0.2.6 -> 0.3.0) - Use this for new features
    npm version minor
    ```

3.  **Publish**:
    This will automatically run `npm run build`, `npm test`, and `npm run lint` before uploading.
    ```bash
    npm publish
    ```
    *Note: If the push in step 2 failed (e.g. auth issues), strictly run `git push --follow-tags` before publishing.*

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

## 4. Verification Check
    Check [npmjs.com/package/vibechck](https://www.npmjs.com/package/vibechck) to see your package live!
