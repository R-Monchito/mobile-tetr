fn main() {
    // Generate UniFFI scaffolding from the UDL file
    uniffi_build::generate_scaffolding("src/tetrio_mobile.udl")
        .expect("Failed to generate UniFFI scaffolding");
}
