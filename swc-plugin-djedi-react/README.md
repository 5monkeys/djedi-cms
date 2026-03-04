# SWC Plugin for Djedi React

This is an SWC compiler plugin that transforms Djedi React node components.

## Building

###

```bash
# Build the plugin
make build

# Build and copy to project root
make release

# Run tests
make test

# Clean build artifacts
make clean
```

## Testing

```bash
make test
```

## Development

The plugin is written in Rust and compiles to WebAssembly. The main source code is in `src/lib.rs`.

### Project Structure

- `src/lib.rs` - Main plugin implementation
- `tests/` - Test files and snapshots
- `Cargo.toml` - Rust package configuration
- `rust-toolchain.toml` - Rust version specification
- `.cargo/config.toml` - Cargo configuration

## Cleaning

To remove all build artifacts and start fresh:

```bash
make clean
```
