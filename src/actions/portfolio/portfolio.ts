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
import { formatPortfolioData, getZapperHeaders } from "../../utils";
import { validateZapperConfig } from "../../environment";
export const portfolioAction: Action = {
    name: "ZAPPER_PORTFOLIO",
    description: "Get the portfolio from given address or addresses",
    similes: ["GET_PORTFOLIO"],
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
        async function getZapperAssets(addresses: string[]) {
            const query = `
                query Portfolio($addresses: [Address!]!) {
                    portfolio(addresses: $addresses) {
                        tokenBalances {
                            address
                            network
                            token {
                                balance
                                balanceUSD
                                baseToken {
                                    name
                                    symbol
                                }
                            }
                        }
                        nftBalances {
                            network
                            balanceUSD
                        }
                        totals {
                            total
                            totalWithNFT
                            totalByNetwork {
                                network
                                total
                            }
                            holdings {
                                label
                                balanceUSD
                                pct
                            }
                        }
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
                        addresses: addresses
                    }
                })
            });

            const data = await response.json();
            
            if (data.errors) {
                elizaLogger.error({ errors: data.errors }, "Zapper API returned errors");
                throw new Error("Failed to fetch data from Zapper API");
            }

            try {
                const formattedResponse = formatPortfolioData(data);
                return formattedResponse;
            } catch (error) {
                elizaLogger.error({ error }, "Error formatting portfolio data");
                throw error;
            }
        }

        try {
            const context = `Extract only the blockchain wallet addresses from this text, returning them as a comma-separated list with no other text or explanations. The message is:
            ${_message.content.text}`;

            const extractedAddressesText = await generateText({
                runtime: _runtime,
                context,
                modelClass: ModelClass.SMALL,
                stop: ["\n"]
            });

            const addresses = extractedAddressesText
                .split(',')
                .map(addr => addr.trim())
                .filter(addr => addr.length > 0);

            elizaLogger.info({ addresses }, "Extracted addresses");

            if (addresses.length === 0) {
                throw new Error("No wallet addresses found in the message");
            }

            const assetsInfo = await getZapperAssets(addresses);

            const responseText = `⚡ Here is the portfolio for the provided addresses:
\n${assetsInfo}`;

            const newMemory: Memory = {
                userId: _message.userId,
                agentId: _message.agentId,
                roomId: _message.roomId,
                content: {
                    text: responseText,
                    action: "ZAPPER_PORTFOLIO_RESPONSE",
                    source: _message.content?.source,
                } as Content,
            };

            await _runtime.messageManager.createMemory(newMemory);
            _callback(newMemory.content);

            return true;
        } catch (error) {
            elizaLogger.error("Error in portfolioAction:", error);
            throw error;
        }
    },
};
