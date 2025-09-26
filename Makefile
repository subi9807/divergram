.PHONY: dev lint test build clean install

# Default environment
ENV ?= development

# Development commands
dev:
	@echo "🚀 Starting Divergram development server..."
	EXPO_NO_TELEMETRY=1 npx expo start --port 8081 --tunnel --non-interactive --clear

# Linting
lint:
	@echo "🔍 Running linter..."
	npx expo lint

# Testing
test:
	@echo "🧪 Running tests..."
	npm test

# Type checking
typecheck:
	@echo "📝 Running TypeScript type check..."
	npx tsc --noEmit

# Install dependencies
install:
	@echo "📦 Installing dependencies..."
	npm install

# Clean caches
clean:
	@echo "🧹 Cleaning caches..."
	npx expo start -c
	npm run clean

# Build commands
build-web:
	@echo "🌐 Building for web..."
	npm run build:web

build-ios:
	@echo "🍎 Building for iOS..."
	eas build --platform ios --profile production

build-android:
	@echo "🤖 Building for Android..."
	eas build --platform android --profile production

# Development builds
dev-build-ios:
	@echo "🍎 Building development iOS..."
	eas build --platform ios --profile development

dev-build-android:
	@echo "🤖 Building development Android..."
	eas build --platform android --profile development

# Utility commands
doctor:
	@echo "🩺 Running Expo doctor..."
	npx expo doctor

update:
	@echo "⬆️ Updating dependencies..."
	npx expo install --fix

# Setup commands
setup-ios:
	@echo "🍎 Setting up iOS development..."
	@echo "Make sure Xcode is installed and configured"
	npx pod-install

setup-android:
	@echo "🤖 Setting up Android development..."
	@echo "Make sure Android Studio is installed"
	@echo "Configure Android SDK path in ~/.zshrc or ~/.bashrc:"
	@echo "export ANDROID_HOME=~/Library/Android/sdk"
	@echo "export PATH=\$$PATH:\$$ANDROID_HOME/tools:\$$ANDROID_HOME/platform-tools"

# EAS commands
eas-login:
	@echo "🔐 Logging into EAS..."
	eas login

eas-build-configure:
	@echo "⚙️ Configuring EAS Build..."
	eas build:configure

# Git hooks
pre-commit:
	@echo "🔍 Running pre-commit checks..."
	npm run lint
	npm run typecheck
	npm test -- --passWithNoTests

# Help
help:
	@echo "📚 Available commands:"
	@echo "  make dev                 - Start development server"
	@echo "  make lint                - Run linting"
	@echo "  make test                - Run tests"
	@echo "  make typecheck           - Run TypeScript type check"
	@echo "  make install             - Install dependencies"
	@echo "  make clean               - Clean caches"
	@echo "  make build-web           - Build for web"
	@echo "  make build-ios           - Build for iOS production"
	@echo "  make build-android       - Build for Android production"
	@echo "  make dev-build-ios       - Build for iOS development"
	@echo "  make dev-build-android   - Build for Android development"
	@echo "  make setup-ios           - Setup iOS development"
	@echo "  make setup-android       - Setup Android development"
	@echo "  make eas-login           - Login to EAS"
	@echo "  make doctor              - Run Expo doctor"
	@echo "  make help                - Show this help"