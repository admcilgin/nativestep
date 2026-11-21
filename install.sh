#!/usr/bin/env bash
# Installs the nativestep CLI (latest release) into ~/.nativestep and the skills plugin into Claude Code.
#   curl -fsSL https://admcilgin.github.io/nativestep/install.sh | bash
# Served by GitHub Pages from the repo root of main (.nojekyll serves files as they are). Rerun to update.
set -euo pipefail

REPO=admcilgin/nativestep
DEST="${NATIVESTEP_HOME:-$HOME/.nativestep}"

case "$(uname -s)" in
  Darwin) os=darwin ;;
  Linux) os=linux ;;
  *) echo "nativestep: unsupported OS $(uname -s)" >&2; exit 1 ;;
esac
case "$(uname -m)" in
  arm64 | aarch64) arch=arm64 ;;
  x86_64 | amd64) arch=x64 ;;
  *) echo "nativestep: unsupported CPU $(uname -m)" >&2; exit 1 ;;
esac
target="$os-$arch"

# Unpack beside DEST and swap, so files a newer release removed don't linger and a failed download keeps the old install.
echo "Downloading nativestep-$target ..."
mkdir -p "$(dirname "$DEST")"
tmp="$(mktemp -d "$DEST.XXXXXX")"
trap 'rm -rf "$tmp"' EXIT
curl -fsSL "https://github.com/$REPO/releases/latest/download/nativestep-$target.tar.gz" | tar -xz -C "$tmp" --strip-components=1
rm -rf "$DEST"
mv "$tmp" "$DEST"
trap - EXIT
echo "CLI: $DEST/bin/nativestep"

case ":$PATH:" in
  *":$DEST/bin:"*) ;;
  *)
    case "$(basename "${SHELL:-}")" in
      zsh) rc="$HOME/.zshrc" ;;
      bash) rc="$HOME/.bashrc" ;;
      *) rc="" ;;
    esac
    line="export PATH=\"$DEST/bin:\$PATH\""
    if [ -n "$rc" ]; then
      grep -qxF "$line" "$rc" 2>/dev/null || { printf '\n%s\n' "$line" >> "$rc"; echo "Added $DEST/bin to PATH in $rc."; }
      echo "Open a new terminal, or run: $line"
    else
      echo "Add to your PATH: $line"
    fi
    ;;
esac

if command -v claude >/dev/null 2>&1; then
  echo "Installing the nativestep skills into Claude Code ..."
  claude plugin install nativestep --marketplace "$REPO" --scope user
  # On a rerun the plugin is already installed; pull the latest skills.
  claude plugin marketplace update nativestep
  claude plugin update nativestep@nativestep --scope user
else
  echo "Claude Code not found. Install it, then in Claude Code run:"
  echo "  /plugin marketplace add $REPO"
  echo "  /plugin install nativestep@nativestep"
fi
