export type ZapperPortfolioResponse = {
  data: {
    portfolio: {
      tokenBalances: Array<{
        address: string;
        network: string;
        token: {
          balance: number;
          balanceUSD: number;
          baseToken: {
            name: string;
            symbol: string;
          };
        };
      }>;
      nftBalances: Array<{
        network: string;
        balanceUSD: number;
      }>;
      totals: {
        total: number;
        totalWithNFT: number;
        totalByNetwork: Array<{
          network: string;
          total: number;
        }>;
        holdings: Array<{
          label: string;
          balanceUSD: number;
          pct: number;
        }>;
      };
    };
  };
};

export type ZapperFarcasterResponse = {
  data: {
    farcasterProfile: {
      username: string;
      fid: number;
      metadata: {
        displayName: string;
        description: string;
        imageUrl: string;
        warpcast: string;
      };
      connectedAddresses: string[];
      custodyAddress: string;
    };
  };
};