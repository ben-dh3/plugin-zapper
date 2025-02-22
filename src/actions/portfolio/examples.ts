export default [
    [
        {
            user: "{{user1}}",
            content: {
                text: "Show me the holdings for 0x187c7b0393ebe86378128f2653d0930e33218899",
            },
        },
        {
            user: "{{user2}}",
            content: { text: "", action: "ZAPPER_PORTFOLIO" },
        },
    ],
    [
        {
            user: "{{user1}}",
            content: {
                text: "Check these wallets: 0xd8da6bf26964af9d7eed9e03e53415d37aa96045, 0xadd746be46ff36f10c81d6e3ba282537f4c68077",
            },
        },
        {
            user: "{{user2}}",
            content: { text: "", action: "ZAPPER_PORTFOLIO" },
        },
    ],
];