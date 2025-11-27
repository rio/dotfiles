$env.config.edit_mode = 'vi'

if (which nvim | is-not-empty) {
  $env.EDITOR = "nvim"
  $env.VISUAL = "nvim"
}

# aliases
alias ll = ls -l
alias la = ls -la

use ($nu.default-config-dir | path join mise.nu)
