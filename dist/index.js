// src/actions/portfolio/portfolio.ts
import {
  elizaLogger,
  generateText,
  ModelClass
} from "@elizaos/core";

// src/actions/portfolio/examples.ts
var examples_default = [
  [
    {
      user: "{{user1}}",
      content: {
        text: "Show me the holdings for 0x187c7b0393ebe86378128f2653d0930e33218899"
      }
    },
    {
      user: "{{user2}}",
      content: { text: "", action: "ZAPPER_PORTFOLIO" }
    }
  ],
  [
    {
      user: "{{user1}}",
      content: {
        text: "Check these wallets: 0xd8da6bf26964af9d7eed9e03e53415d37aa96045, 0xadd746be46ff36f10c81d6e3ba282537f4c68077"
      }
    },
    {
      user: "{{user2}}",
      content: { text: "", action: "ZAPPER_PORTFOLIO" }
    }
  ]
];

// src/utils.ts
function getZapperHeaders(config) {
  const encodedKey = btoa(config.ZAPPER_API_KEY);
  return {
    "Content-Type": "application/json",
    "Authorization": `Basic ${encodedKey}`
  };
}
var formatPortfolioData = (data) => {
  const portfolio = data.data.portfolio;
  const tokenSection = portfolio.tokenBalances.sort((a, b) => b.token.balanceUSD - a.token.balanceUSD).slice(0, 5).map((balance) => {
    const formattedBalance = Number(balance.token.balance).toLocaleString(void 0, {
      maximumFractionDigits: 4
    });
    const formattedUSD = balance.token.balanceUSD.toLocaleString(void 0, {
      style: "currency",
      currency: "USD"
    });
    return `${balance.token.baseToken.name} (${balance.token.baseToken.symbol})
Network: ${balance.network}
Balance: ${formattedBalance}
Value: ${formattedUSD}`;
  }).join("\n");
  const nftSection = portfolio.nftBalances.map((nft) => {
    const formattedUSD = nft.balanceUSD.toLocaleString(void 0, {
      style: "currency",
      currency: "USD"
    });
    return `${nft.network}
NFT Value: ${formattedUSD}`;
  }).join("\n");
  const totalUSD = portfolio.totals.total.toLocaleString(void 0, {
    style: "currency",
    currency: "USD"
  });
  const totalWithNFTUSD = portfolio.totals.totalWithNFT.toLocaleString(void 0, {
    style: "currency",
    currency: "USD"
  });
  const networkTotals = portfolio.totals.totalByNetwork.filter((net) => net.total > 0).sort((a, b) => b.total - a.total).map((net) => {
    const formattedUSD = net.total.toLocaleString(void 0, {
      style: "currency",
      currency: "USD"
    });
    return `${net.network}: ${formattedUSD}`;
  }).join("\n");
  return `\u{1F4B0} Portfolio Summary:
Total Value (excluding NFTs): ${totalUSD}
Total Value (including NFTs): ${totalWithNFTUSD}
        
\u{1F310} Network Breakdown:
${networkTotals}
        
\u{1FA99} Top Token Holdings:
${tokenSection}
        
\u{1F3A8} NFT Holdings:
${nftSection}`;
};
var formatFarcasterData = (data) => {
  const profile = data.data?.farcasterProfile;
  const allAddresses = [
    ...profile?.connectedAddresses || [],
    profile?.custodyAddress
  ].filter(Boolean);
  return { addresses: allAddresses };
};

// src/environment.ts
import { z } from "zod";
var zapperEnvironmentSchema = z.object({
  ZAPPER_API_KEY: z.string().min(1, "ZAPPER_API_KEY is required")
});
async function validateZapperConfig(runtime) {
  try {
    const config = {
      ZAPPER_API_KEY: runtime.getSetting("ZAPPER_API_KEY") || process.env.ZAPPER_API_KEY
    };
    return zapperEnvironmentSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors.map((e) => e.message).join("\n");
      throw new Error(`Zapper Configuration Error:
${errorMessage}`);
    }
    throw error;
  }
}

// src/actions/portfolio/portfolio.ts
var portfolioAction = {
  name: "ZAPPER_PORTFOLIO",
  description: "Get the portfolio from given address or addresses",
  similes: ["GET_PORTFOLIO"],
  examples: examples_default,
  validate: async (runtime, message) => {
    return true;
  },
  handler: async (_runtime, _message, _state, _options, _callback) => {
    async function getZapperAssets(addresses) {
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
      const headers = getZapperHeaders(config);
      const response = await fetch("https://public.zapper.xyz/graphql", {
        method: "POST",
        headers,
        body: JSON.stringify({
          query,
          variables: {
            addresses
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
      const addresses = extractedAddressesText.split(",").map((addr) => addr.trim()).filter((addr) => addr.length > 0);
      elizaLogger.info({ addresses }, "Extracted addresses");
      if (addresses.length === 0) {
        throw new Error("No wallet addresses found in the message");
      }
      const assetsInfo = await getZapperAssets(addresses);
      const responseText = `\u26A1 Here is the portfolio for the provided addresses:

${assetsInfo}`;
      const newMemory = {
        userId: _message.userId,
        agentId: _message.agentId,
        roomId: _message.roomId,
        content: {
          text: responseText,
          action: "ZAPPER_PORTFOLIO_RESPONSE",
          source: _message.content?.source
        }
      };
      await _runtime.messageManager.createMemory(newMemory);
      if (_callback) {
        _callback(newMemory.content);
      }
      return true;
    } catch (error) {
      elizaLogger.error("Error in portfolioAction:", error);
      throw error;
    }
  }
};

// src/actions/farcasterPortfolio/farcasterPortfolio.ts
import {
  elizaLogger as elizaLogger2,
  generateText as generateText2,
  ModelClass as ModelClass2
} from "@elizaos/core";

// src/actions/farcasterPortfolio/examples.ts
var examples_default2 = [
  [
    {
      user: "{{user1}}",
      content: {
        text: "Show me the holdings for Farcaster users @vitalik.eth and @jessepollak"
      }
    },
    {
      user: "{{user2}}",
      content: { text: "", action: "FARCASTER_PORTFOLIO" }
    }
  ],
  [
    {
      user: "{{user1}}",
      content: {
        text: "What's the portfolio for @dwr.eth?"
      }
    },
    {
      user: "{{user2}}",
      content: { text: "", action: "FARCASTER_PORTFOLIO" }
    }
  ]
];

// src/actions/farcasterPortfolio/farcasterPortfolio.ts
var farcasterPortfolioAction = {
  name: "FARCASTER_PORTFOLIO",
  description: "Get the portfolio for one or more Farcaster usernames",
  similes: ["GET_FARCASTER_PORTFOLIO"],
  examples: examples_default2,
  validate: async (runtime, message) => {
    return true;
  },
  handler: async (_runtime, _message, _state, _options, _callback) => {
    async function getFarcasterAddresses(username) {
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
      const headers = getZapperHeaders(config);
      const response = await fetch("https://public.zapper.xyz/graphql", {
        method: "POST",
        headers,
        body: JSON.stringify({
          query,
          variables: {
            username
          }
        })
      });
      const data = await response.json();
      if (data.errors) {
        elizaLogger2.error({ errors: data.errors }, "Zapper API returned errors");
        throw new Error("Failed to fetch Farcaster addresses");
      }
      try {
        const formattedResponse = formatFarcasterData(data);
        return formattedResponse;
      } catch (error) {
        elizaLogger2.error({ error }, "Error formatting portfolio data");
        throw error;
      }
    }
    try {
      const context = `Extract the Farcaster username from this text, returning it as a string with no @ symbols or other text. The message is:
            ${_message.content.text}`;
      const usernameText = await generateText2({
        runtime: _runtime,
        context,
        modelClass: ModelClass2.SMALL,
        stop: ["\n"]
      });
      const username = usernameText;
      elizaLogger2.info({ username }, "Extracted Farcaster username");
      const { addresses } = await getFarcasterAddresses(username);
      if (addresses.length === 0) {
        throw new Error("No addresses found for these Farcaster accounts");
      }
      const newMemory = {
        userId: _message.userId,
        agentId: _message.agentId,
        roomId: _message.roomId,
        content: {
          text: `Fetching portfolio for addresses: ${addresses.join(", ")}`,
          action: "ZAPPER_PORTFOLIO",
          source: _message.content?.source,
          addresses
        }
      };
      await _runtime.messageManager.createMemory(newMemory);
      if (_callback) {
        _callback(newMemory.content);
      }
      await _runtime.processActions(newMemory, [newMemory], _state, _callback);
      return true;
    } catch (error) {
      elizaLogger2.error("Error in farcasterPortfolio:", error);
      throw error;
    }
  }
};

// src/index.ts
var zapperPlugin = {
  name: "zapper",
  description: "A plugin for integrating the Zapper API with your application.",
  actions: [portfolioAction, farcasterPortfolioAction]
};
var index_default = zapperPlugin;
export {
  index_default as default,
  zapperPlugin
};
//# sourceMappingURL=index.js.map