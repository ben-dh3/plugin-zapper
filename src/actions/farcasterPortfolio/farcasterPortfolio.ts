import {
    Content,
    elizaLogger,
    generateText,
    ModelClass,
    type Action,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    type State,
} from "@elizaos/core";
import examples from "./examples";
import { formatFarcasterData, getZapperHeaders } from "../../utils";
import { validateZapperConfig } from "../../environment";

export const farcasterPortfolioAction: Action = {
    name: "FARCASTER_PORTFOLIO",
    description: "Get the portfolio for one or more Farcaster usernames",
    similes: ["GET_FARCASTER_PORTFOLIO"],
    examples: examples,
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        return true;
    },
    handler: async (
        _runtime: IAgentRuntime,
        _message: Memory,
        _state: State,
        _options: { [key: string]: unknown },
        _callback: HandlerCallback
    ): Promise<boolean> => {
        async function getFarcasterAddresses(username: string): Promise<{
            addresses: string[],
        }> {
            const query = `
                query GetFarcasterAddresses($username: String!) {
                    farcasterProfile(username: $username) {
                        username
                        fid
                        metadata {
                            displayName
                            description
                            imageUrl
                            warpcast
                        }
                        connectedAddresses
                        custodyAddress
                    }
                }
            `;
            const config = await validateZapperConfig(_runtime);
            const headers = getZapperHeaders(config)
            const response = await fetch('https://public.zapper.xyz/graphql', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    query,
                    variables: {
                        username: username
                    }
                })
            });

            const data = await response.json();
            
            if (data.errors) {
                elizaLogger.error({ errors: data.errors }, "Zapper API returned errors");
                throw new Error("Failed to fetch Farcaster addresses");
            }

            try {
                const formattedResponse = formatFarcasterData(data);
                return formattedResponse;
            } catch (error) {
                elizaLogger.error({ error }, "Error formatting portfolio data");
                throw error;
            }
        }

        try {
            const context = `Extract the Farcaster username from this text, returning it as a string with no @ symbols or other text. The message is:
            ${_message.content.text}`;

            const usernameText = await generateText({
                runtime: _runtime,
                context,
                modelClass: ModelClass.SMALL,
                stop: ["\n"]
            });

            const username = usernameText

            elizaLogger.info({ username }, "Extracted Farcaster username");

            const { addresses } = await getFarcasterAddresses(username);
            
            if (addresses.length === 0) {
                throw new Error("No addresses found for these Farcaster accounts");
            }

            const newMemory: Memory = {
                userId: _message.userId,
                agentId: _message.agentId,
                roomId: _message.roomId,
                content: {
                    text: `Fetching portfolio for addresses: ${addresses.join(', ')}`,
                    action: "ZAPPER_PORTFOLIO",
                    source: _message.content?.source,
                    addresses: addresses,
                } as Content,
            };
            
            await _runtime.messageManager.createMemory(newMemory);
            _callback(newMemory.content);
            // Run the portfolio action with addresses found in Farcaster profiles
            await _runtime.processActions(newMemory, [newMemory], _state, _callback);

            return true;
        } catch (error) {
            elizaLogger.error("Error in farcasterPortfolio:", error);
            throw error;
        }
    },
};