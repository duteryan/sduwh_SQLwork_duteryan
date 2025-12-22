@echo off
title SQL 商品系统 启动器

echo ========================================
echo   SQL 商品系统 一键启动脚本
echo ========================================

:: 切换到脚本所在目录
cd /d %~dp0

:: 1. 创建虚拟环境
if not exist .venv (
    echo [INFO] 正在创建虚拟环境 .venv
    python -m venv .venv
)

:: 2. 激活虚拟环境
echo [INFO] 正在激活虚拟环境...
call .venv\Scripts\activate.bat

:: 3. 升级 pip
echo [INFO] 正在升级 pip...
python -m pip install --upgrade pip -i https://pypi.tuna.tsinghua.edu.cn/simple

:: 4. 安装依赖
echo [INFO] 正在安装依赖 requirements.txt
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

:: 5. 启动后端（重点修正）
echo [INFO] 启动 FastAPI 后端
start cmd /k "cd backend && uvicorn app:app --reload"

:: 6. 打开前端页面
echo [INFO] 打开前端页面
start frontend\index.html

echo ========================================
echo   启动完成
echo   后端：http://127.0.0.1:8000
echo ========================================

pause
