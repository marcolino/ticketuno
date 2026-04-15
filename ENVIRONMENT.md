# Environment & Secrets Management

ticketuno uses [`git-crypt`](https://github.com/AGWA/git-crypt) to transparently encrypt `.env` inside the repository. The file is stored encrypted on GitHub and decrypted automatically on any authorised machine.

The master key is stored as a base64-encoded file in a private GitHub Gist. The gist ID is kept in a gitignored `.gist-id` file so it is never committed in clear.

---

## How it works

- `.env` is listed in `.gitattributes` with the `git-crypt` filter.
- On `git push`, git-crypt encrypts `.env` transparently — no extra steps needed.
- On `git pull` / `git clone`, the file stays encrypted until you unlock the repo with the key.
- `.env.example` is committed unencrypted and contains all required keys with placeholder values.

---

## Prerequisites

Install `git-crypt` and the GitHub CLI once on each machine:

```bash
# macOS
brew install git-crypt gh

# Ubuntu / Debian
sudo apt install git-crypt
sudo apt install gh # or: https://github.com/cli/cli/blob/trunk/docs/install_linux.md

# Authenticate gh (once per machine)
gh auth login
```

---

## First-time setup (already done — for reference only)

```bash
git-crypt init
git-crypt export-key ~/git-crypt-ticketuno.key

# Store the gist ID (visible in your browser on the gist page)
echo "your-gist-id-here" > .gist-id

# Push key to secret gist
npm run key:push

# Tell git-crypt to encrypt .env
echo ".env filter=git-crypt diff=git-crypt" >> .gitattributes
git add .gitattributes .env
git commit -m "chore: encrypt .env with git-crypt"
git push
```

---

## Setting up a fresh clone

1. **Clone the repo**
   ```bash
   git clone <repo-url>
   cd ticketuno
   ```

2. **Authenticate GitHub CLI** (if not already)
   ```bash
   gh auth login
   ```

3. **Set the gist ID** (visible in your browser when logged into GitHub, on the secret gist page)
   ```bash
   cp .gist-id.example .gist-id
   # edit .gist-id and replace the placeholder with the real ID
   ```

4. **Pull the key and unlock**
   ```bash
   npm run key:pull
   git-crypt unlock ~/git-crypt-ticketuno.key
   ```

5. **Verify**
   ```bash
   head -1 .env    # should show a readable line, not binary garbage
   ```

---

## Day-to-day usage

Nothing changes. Edit `.env` normally. Commit and push as usual — encryption is fully automatic.

`npm run key:push` is only needed if you ever **regenerate the key itself** (after a full `git-crypt uninit` + reinit). Rotating secrets in `.env` does not require it.

To check which files are managed by git-crypt:

```bash
git-crypt status
```

---

## npm scripts

Defined in `package.json`. The gist ID is read from the gitignored `.gist-id` file — it is never stored in clear in the repository.

```json
"scripts": {
  "key:push": "base64 ~/git-crypt-ticketuno.key > /tmp/ticketuno.git.crypt.env.b64 && gh gist edit $(cat .gist-id) /tmp/ticketuno.git.crypt.env.b64 && rm /tmp/ticketuno.git.crypt.env.b64",
  "key:pull": "gh gist view $(cat .gist-id) --filename ticketuno.git.crypt.env.b64 --raw | base64 -d > ~/git-crypt-ticketuno.key && chmod 600 ~/git-crypt-ticketuno.key"
}
```

---

## If you lose access to the gist

As a fallback, keep a copy of the key in one additional safe location (iCloud, encrypted USB). Convert to/from base64 for safe storage:

```bash
# Store
base64 ~/git-crypt-ticketuno.key > git-crypt-ticketuno.key.b64

# Restore
base64 -d git-crypt-ticketuno.key.b64 > ~/git-crypt-ticketuno.key
chmod 600 ~/git-crypt-ticketuno.key
```

If the key is truly lost, you will need to:
1. `git-crypt uninit` the repo (removes encryption)
2. Rotate **all** secrets in `.env`
3. Re-initialise git-crypt from scratch

---

## Files overview

| File | Committed | Encrypted | Purpose |
|---|---|---|---|
| `.env` | ✅ | ✅ | Real secrets — encrypted by git-crypt |
| `.env.example` | ✅ | ❌ | All keys with placeholder values |
| `.gist-id` | ❌ | — | Secret gist ID — gitignored |
| `.gist-id.example` | ✅ | ❌ | Placeholder — reminds you to create `.gist-id` |
| `git-crypt-ticketuno.key` | ❌ | — | Master key — stored in secret gist |
