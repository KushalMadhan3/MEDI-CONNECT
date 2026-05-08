# PowerShell script to start Redis and RabbitMQ using Docker
# Make sure Docker Desktop is installed and running

Write-Host "🚀 Starting Redis and RabbitMQ services..." -ForegroundColor Cyan

# Check if Docker is available
try {
    docker --version | Out-Null
    Write-Host "✅ Docker is available" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not installed or not running" -ForegroundColor Red
    Write-Host "   Please install Docker Desktop from: https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
    Write-Host "   Or see WINDOWS_SETUP.md for alternative installation methods" -ForegroundColor Yellow
    exit 1
}

# Check if containers already exist
$redisExists = docker ps -a --filter "name=redis" --format "{{.Names}}" 2>$null
$rabbitmqExists = docker ps -a --filter "name=rabbitmq" --format "{{.Names}}" 2>$null

# Start or create Redis
if ($redisExists) {
    Write-Host "📦 Starting existing Redis container..." -ForegroundColor Yellow
    docker start redis
} else {
    Write-Host "📦 Creating new Redis container..." -ForegroundColor Yellow
    docker run -d --name redis -p 6379:6379 redis
}

# Start or create RabbitMQ
if ($rabbitmqExists) {
    Write-Host "📦 Starting existing RabbitMQ container..." -ForegroundColor Yellow
    docker start rabbitmq
} else {
    Write-Host "📦 Creating new RabbitMQ container..." -ForegroundColor Yellow
    docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management
}

# Wait a moment for services to start
Start-Sleep -Seconds 3

# Verify services
Write-Host "`n🔍 Verifying services..." -ForegroundColor Cyan

$redisRunning = docker ps --filter "name=redis" --format "{{.Names}}" 2>$null
$rabbitmqRunning = docker ps --filter "name=rabbitmq" --format "{{.Names}}" 2>$null

if ($redisRunning) {
    Write-Host "✅ Redis is running on port 6379" -ForegroundColor Green
} else {
    Write-Host "❌ Redis failed to start" -ForegroundColor Red
}

if ($rabbitmqRunning) {
    Write-Host "✅ RabbitMQ is running on port 5672" -ForegroundColor Green
    Write-Host "   Management UI: http://localhost:15672 (guest/guest)" -ForegroundColor Cyan
} else {
    Write-Host "❌ RabbitMQ failed to start" -ForegroundColor Red
}

Write-Host "`n✨ Done! You can now start your server with: npm run server" -ForegroundColor Green















