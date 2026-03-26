@echo off
setlocal enabledelayedexpansion

echo ================================================
echo          Local Development Server Launcher
echo ================================================
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Display Node.js version
echo Node.js version:
node --version
echo.

:: Check if we're in a valid project directory
if not exist "package.json" (
    echo WARNING: No package.json found in current directory
    echo This might not be a Node.js project directory
    echo.
    set /p continue="Continue anyway? (y/n): "
    if /i "!continue!" neq "y" (
        echo Exiting...
        pause
        exit /b 0
    )
)

:: Check for different project types and package managers
set PROJECT_TYPE=unknown
set PACKAGE_MANAGER=npm

:: Detect package manager
if exist "yarn.lock" (
    set PACKAGE_MANAGER=yarn
    echo Detected: Yarn project
) else if exist "pnpm-lock.yaml" (
    set PACKAGE_MANAGER=pnpm
    echo Detected: PNPM project
) else if exist "package-lock.json" (
    set PACKAGE_MANAGER=npm
    echo Detected: NPM project
) else (
    echo No lock file found, defaulting to NPM
)

:: Detect project type
if exist "next.config.js" (
    set PROJECT_TYPE=nextjs
    echo Detected: Next.js project
) else if exist "next.config.ts" (
    set PROJECT_TYPE=nextjs
    echo Detected: Next.js project (TypeScript config)
) else if exist "vite.config.js" (
    set PROJECT_TYPE=vite
    echo Detected: Vite project
) else if exist "vite.config.ts" (
    set PROJECT_TYPE=vite
    echo Detected: Vite project (TypeScript)
) else if exist "angular.json" (
    set PROJECT_TYPE=angular
    echo Detected: Angular project
) else if exist "vue.config.js" (
    set PROJECT_TYPE=vue
    echo Detected: Vue.js project
) else if exist "webpack.config.js" (
    set PROJECT_TYPE=webpack
    echo Detected: Webpack project
) else if exist "tsconfig.json" (
    set PROJECT_TYPE=typescript
    echo Detected: TypeScript project
) else (
    echo Detected: Generic Node.js project
)

echo Package Manager: %PACKAGE_MANAGER%
echo.

:: Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo Installing dependencies...
    echo.
    if "%PACKAGE_MANAGER%"=="yarn" (
        yarn install
    ) else if "%PACKAGE_MANAGER%"=="pnpm" (
        pnpm install
    ) else (
        npm install
    )
    
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
    echo.
    echo Dependencies installed successfully!
    echo.
)

:: Check package.json for available scripts
echo Available scripts:
if exist "package.json" (
    findstr /i "\"dev\"\|\"start\"\|\"serve\"\|\"preview\"" package.json 2>nul
)
echo.

:: Start the development server based on project type
echo Starting development server...
echo.

if "%PROJECT_TYPE%"=="nextjs" (
    echo Starting Next.js development server...
    if "%PACKAGE_MANAGER%"=="yarn" (
        yarn dev
    ) else if "%PACKAGE_MANAGER%"=="pnpm" (
        pnpm dev
    ) else (
        npm run dev
    )
) else if "%PROJECT_TYPE%"=="vite" (
    echo Starting Vite development server...
    if "%PACKAGE_MANAGER%"=="yarn" (
        yarn dev
    ) else if "%PACKAGE_MANAGER%"=="pnpm" (
        pnpm dev
    ) else (
        npm run dev
    )
) else if "%PROJECT_TYPE%"=="angular" (
    echo Starting Angular development server...
    if "%PACKAGE_MANAGER%"=="yarn" (
        yarn start
    ) else if "%PACKAGE_MANAGER%"=="pnpm" (
        pnpm start
    ) else (
        npm start
    )
) else if "%PROJECT_TYPE%"=="vue" (
    echo Starting Vue.js development server...
    if "%PACKAGE_MANAGER%"=="yarn" (
        yarn serve
    ) else if "%PACKAGE_MANAGER%"=="pnpm" (
        pnpm serve
    ) else (
        npm run serve
    )
) else (
    :: Try common development scripts
    echo Attempting to start development server...
    
    :: Try dev script first
    findstr /i "\"dev\"" package.json >nul 2>&1
    if not errorlevel 1 (
        echo Running dev script...
        if "%PACKAGE_MANAGER%"=="yarn" (
            yarn dev
        ) else if "%PACKAGE_MANAGER%"=="pnpm" (
            pnpm dev
        ) else (
            npm run dev
        )
    ) else (
        :: Try start script
        findstr /i "\"start\"" package.json >nul 2>&1
        if not errorlevel 1 (
            echo Running start script...
            if "%PACKAGE_MANAGER%"=="yarn" (
                yarn start
            ) else if "%PACKAGE_MANAGER%"=="pnpm" (
                pnpm start
            ) else (
                npm start
            )
        ) else (
            :: Try serve script
            findstr /i "\"serve\"" package.json >nul 2>&1
            if not errorlevel 1 (
                echo Running serve script...
                if "%PACKAGE_MANAGER%"=="yarn" (
                    yarn serve
                ) else if "%PACKAGE_MANAGER%"=="pnpm" (
                    pnpm serve
                ) else (
                    npm run serve
                )
            ) else (
                echo No suitable development script found in package.json
                echo Available options:
                echo 1. npm start
                echo 2. npm run dev
                echo 3. npx serve . (for static files)
                echo 4. npx http-server . (alternative static server)
                echo.
                set /p choice="Enter your choice (1-4) or press Enter for option 1: "
                
                if "!choice!"=="" set choice=1
                if "!choice!"=="1" (
                    npm start
                ) else if "!choice!"=="2" (
                    npm run dev
                ) else if "!choice!"=="3" (
                    npx serve .
                ) else if "!choice!"=="4" (
                    npx http-server .
                ) else (
                    echo Invalid choice, running npm start...
                    npm start
                )
            )
        )
    )
)

:: If we get here, the server has stopped
echo.
echo Development server has stopped.
pause