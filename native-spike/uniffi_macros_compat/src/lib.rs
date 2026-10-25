use proc_macro::TokenStream;

/// Compatibility derive for the UDL-based binding configuration.
///
/// UniFFI scaffolding generated from `tetrio_mobile.udl` owns the FFI trait
/// implementations. These derives intentionally preserve the Rust item without
/// generating another set of implementations.
#[proc_macro_derive(Enum)]
pub fn enum_derive(input: TokenStream) -> TokenStream {
    input
}

#[proc_macro_derive(Record)]
pub fn record_derive(input: TokenStream) -> TokenStream {
    input
}
