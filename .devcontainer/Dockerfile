FROM mcr.microsoft.com/devcontainers/base:debian-13

RUN curl -sSLf https://mise.run | MISE_INSTALL_PATH=/usr/local/bin/mise sh && \
    echo 'eval "$(mise activate zsh)"' >> /home/vscode/.zshrc && \
    echo 'eval "$(mise activate bash)"' >> /home/vscode/.bashrc