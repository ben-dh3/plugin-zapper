export default [
    [
        {
            user: "{{user1}}",
            content: {
                text: "Show me the holdings for Farcaster users @vitalik.eth and @jessepollak",
            },
        },
        {
            user: "{{user2}}",
            content: { text: "", action: "FARCASTER_PORTFOLIO" },
        },
    ],
    [
        {
            user: "{{user1}}",
            content: {
                text: "What's the portfolio for @dwr.eth?",
            },
        },
        {
            user: "{{user2}}",
            content: { text: "", action: "FARCASTER_PORTFOLIO" },
        },
    ],
];