return {
  {
    "williamboman/mason-lspconfig.nvim",
    opts = {
      ensure_installed = {
        "lua_ls",
        "marksman",
        "yamlls",
      }
    }
  }
}
