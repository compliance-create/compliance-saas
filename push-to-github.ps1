# ============================================================
#  push-to-github.ps1
#  把本仓库推送到你的 GitHub
#  用法: 右键 -> "用 PowerShell 运行" -> 按提示输入
# ============================================================

$ErrorActionPreference = 'Stop'
$env:Path = "C:\Program Files\Git\cmd;$env:Path"

# 切到脚本所在目录（兼容右键执行）
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $ScriptDir

Write-Host "=== 合规 SaaS 推送到 GitHub ===" -ForegroundColor Cyan
Write-Host ""

# 1. 输入 GitHub 用户名
$GithubUser = Read-Host "请输入 GitHub 用户名 (回车跳过用 default)"
if ([string]::IsNullOrWhiteSpace($GithubUser)) {
  $GithubUser = 'YOUR_GITHUB_USERNAME'
}

$RepoName = 'compliance-saas'
$RemoteUrl = "https://github.com/$GithubUser/$RepoName.git"

Write-Host ""
Write-Host "目标仓库: $RemoteUrl" -ForegroundColor Yellow
Write-Host ""

# 2. 检查 remote
$existingRemote = git remote get-url origin 2>&1
if ($LASTEXITCODE -eq 0) {
  Write-Host "已存在 remote: $existingRemote" -ForegroundColor Yellow
  $ans = Read-Host "要替换吗? (y/N)"
  if ($ans -eq 'y' -or $ans -eq 'Y') {
    git remote remove origin
    git remote add origin $RemoteUrl
  }
} else {
  git remote add origin $RemoteUrl
}

# 3. 输入 PAT
Write-Host ""
Write-Host "请到 https://github.com/settings/tokens 生成 Personal Access Token" -ForegroundColor Yellow
Write-Host "  1. Generate new token (classic)" -ForegroundColor Yellow
Write-Host "  2. Note: compliance-saas-deploy" -ForegroundColor Yellow
Write-Host "  3. Expiration: 90 days (或更长)" -ForegroundColor Yellow
Write-Host "  4. Scopes: 勾选 repo" -ForegroundColor Yellow
Write-Host "  5. 生成后复制 ghp_xxxxx" -ForegroundColor Yellow
Write-Host ""
$Pat = Read-Host "粘贴 PAT (不会显示, 直接回车)"

if ([string]::IsNullOrWhiteSpace($Pat)) {
  Write-Host "未提供 PAT, 退出" -ForegroundColor Red
  Pop-Location
  exit 1
}

# 4. 配置 credential helper (避免每次输入 PAT)
$credFile = "$env:USERPROFILE\.git-credentials"
$credLine = "https://${Pat}@github.com`n"
# 追加, 不覆盖 (多个 token 共存)
Add-Content -Path $credFile -Value $credLine -Encoding UTF8
Write-Host "已写入 $credFile" -ForegroundColor Green

git config --global credential.helper store
git config --global credential.useHttpPath true

# 5. 推 main
Write-Host ""
Write-Host "=== 推送 main 分支 ===" -ForegroundColor Cyan
try {
  git push -u origin main 2>&1 | Tee-Object -Variable pushOutput
  if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✓ 推送成功!" -ForegroundColor Green
    Write-Host "仓库地址: https://github.com/$GithubUser/$RepoName" -ForegroundColor Green
    Write-Host ""
    Write-Host "下一步: 打开 https://vercel.com/new 导入这个仓库" -ForegroundColor Yellow
  } else {
    Write-Host "推送失败, 请检查:" -ForegroundColor Red
    Write-Host "  1. GitHub 仓库已创建 (https://github.com/new)" -ForegroundColor Red
    Write-Host "  2. PAT 勾选了 repo 权限" -ForegroundColor Red
    Write-Host "  3. 网络能访问 github.com (国内可能需代理)" -ForegroundColor Red
  }
} catch {
  Write-Host "ERR: $($_.Exception.Message)" -ForegroundColor Red
}

Pop-Location
