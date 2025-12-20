# Makefile for swc-plugin-djedi-react
.PHONY: setup build release clean test help

help:
	@echo "Available targets:"
	@echo "  setup   - Install WASM target"
	@echo "  build   - Build the WASM plugin"
	@echo "  release - Build and copy WASM file to project root"
	@echo "  test    - Run tests"
	@echo "  clean   - Clean build artifacts"

setup:
	@echo "==> Installing WASM target"
	rustup target add wasm32-wasip1

build: setup
	@echo "==> Building WASM plugin"
	cargo build --target wasm32-wasip1 --release

release: build
	@echo "==> Copying WASM file to project root"
	cp target/wasm32-wasip1/release/swc_plugin_djedi_react.wasm .
	@echo "==> Release complete!"

clean:
	@echo "==> Cleaning build artifacts"
	cargo clean

test:
	@echo "==> Running tests"
	cargo test
