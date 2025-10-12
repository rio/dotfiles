# dotfiles

This repository contains my personal dotfiles, managed with [chezmoi](https://www.chezmoi.io/), and designed for seamless use across local, containerized, and cloud development environments. It is structured to work out-of-the-box with:

- **chezmoi**: For dotfile management and templating
- **DevPod**: For reproducible development environments
- **VS Code Dev Containers**: For local and remote container-based development
- **GitHub Codespaces**: For cloud-based development

---

## Repository Structure

```
├── .chezmoi.toml.tmpl         # chezmoi configuration (templated)
├── .chezmoiexternals/         # chezmoi-managed external resources (tools, fonts, configs)
├── .chezmoiscripts/           # chezmoi hook scripts (e.g., install packages)
├── .devcontainer/             # VS Code Dev Container config (Dockerfile, devcontainer.json)
├── dot_*                      # Dotfiles (bashrc, gitconfig, tmux, wezterm, zshrc, etc.)
├── dot_config/                # XDG config files (alacritty, git, k9s, mise, nvim, opencode, starship, zellij)
├── private_dot_gnupg/         # Private GPG config (not tracked by chezmoi)
├── setup                      # Bootstrap script for new machines
```

---

## Usage

### 1. Bootstrapping (Any Environment)

Clone the repo and run the setup script:

```sh
./setup
```

This will:
- Set your shell to zsh (if available)
- Install chezmoi (if not present)
- Apply all dotfiles to your home directory

### 2. chezmoi

chezmoi manages all dotfiles, templates, and external resources. It detects if you are running in a remote/container/Codespaces environment and adapts accordingly (see `.chezmoi.toml.tmpl`).

- **chezmoi apply**: Apply dotfiles to your home directory
- **chezmoi update**: Pull and apply latest changes

### 3. DevPod

DevPod is supported via `.chezmoiexternals/devpod.toml`, which ensures the DevPod binary is installed and available in your environment.

### 4. VS Code Dev Containers

- The `.devcontainer/` folder contains a `devcontainer.json` and a `Dockerfile` based on `ghcr.io/rio/toolbox:latest`.
- Open the repo in VS Code and "Reopen in Container" to get a fully provisioned environment with all tools and dotfiles.

### 5. GitHub Codespaces

- This repo is Codespaces-ready. Just "Open in Codespaces" on GitHub and all dotfiles, tools, and configs will be provisioned automatically.

---

## Highlights

- **Shells**: zsh (default), bash
- **Prompt**: [starship](https://starship.rs/) with custom theme
- **Editor**: [Neovim](https://neovim.io/) (LazyVim-based), with plugins and extras
- **Terminal**: [WezTerm](https://wezfurlong.org/wezterm/), [alacritty](https://alacritty.org/)
- **Multiplexers**: tmux, zellij
- **Tools**: Managed with [mise](https://mise.jdx.dev/) (see `.config/mise/config.toml`)
- **Kubernetes**: k9s with custom skin
- **Fonts**: DepartureMono (auto-installed)

---

## Customization

- All dotfiles are templated for local/remote/container/cloud detection
- Add or modify tools in `.config/mise/config.toml`
- Add external resources in `.chezmoiexternals/`
- Add post-install scripts in `.chezmoiscripts/`

---

## License

These dotfiles are provided as-is for personal use and inspiration. Use at your own risk.
