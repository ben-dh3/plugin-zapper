import { describe, it, expect, vi } from 'vitest';
import { portfolioAction } from '../../actions/portfolio/portfolio';
import { ZapperConfig } from '../../environment';

vi.mock('@elizaos/core', () => ({
    elizaLogger: {
        info: vi.fn(),
        error: vi.fn()
    },
    generateText: vi.fn().mockResolvedValue('0x123,0x456'),
    ModelClass: {
        SMALL: 'SMALL'
    }
}));

const mockConfig: ZapperConfig = {
    ZAPPER_API_KEY: 'mock-api-key',
};

vi.mock('../../utils', () => ({
    getZapperHeaders: vi.fn().mockImplementation(() => {
        const encodedKey = btoa(mockConfig.ZAPPER_API_KEY);
        return {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${encodedKey}`
        };
    }),
    formatPortfolioData: vi.fn().mockReturnValue('Formatted portfolio data')
}));

describe('Portfolio Action', () => {
    const mockRuntime = {
        messageManager: {
            createMemory: vi.fn().mockResolvedValue(undefined)
        },
        getSetting: vi.fn().mockImplementation((key) => {
            if (key === "ZAPPER_API_KEY") {
                return "mock-api-key";
            }
            return null;
        })
    };
    

    const mockMessage = {
        userId: 'user123',
        agentId: 'agent123',
        roomId: 'room123',
        content: {
            text: 'Check portfolio for 0x123, 0x456'
        }
    };

    const mockCallback = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn().mockResolvedValue({
            json: () => Promise.resolve({
                data: {
                    portfolio: {
                        tokenBalances: [],
                        nftBalances: [],
                        totals: {
                            total: 1000,
                            totalWithNFT: 1200,
                            totalByNetwork: [],
                            holdings: []
                        }
                    }
                }
            })
        });
    });

    describe('validate', () => {
        it('should validate successfully', async () => {
            const result = await portfolioAction.validate(mockRuntime, mockMessage);
            expect(result).toBe(true);
        });
    });

    describe('action properties', () => {
        it('should have correct action properties', () => {
            expect(portfolioAction.name).toBe('ZAPPER_PORTFOLIO');
            expect(portfolioAction.description).toBeDefined();
            expect(Array.isArray(portfolioAction.similes)).toBe(true);
            expect(portfolioAction.similes).toContain('GET_PORTFOLIO');
            expect(Array.isArray(portfolioAction.examples)).toBe(true);
        });
    });

    describe('handler', () => {
        it('should process addresses and fetch portfolio data successfully', async () => {
            const result = await portfolioAction.handler(
                mockRuntime,
                mockMessage,
                {},
                {},
                mockCallback
            );

            expect(result).toBe(true);
            expect(mockRuntime.messageManager.createMemory).toHaveBeenCalled();
            expect(mockCallback).toHaveBeenCalled();
        });

        it('should handle case with no addresses found', async () => {
            vi.mocked(global.fetch).mockResolvedValueOnce({
                json: () => Promise.resolve({ data: null, errors: [{ message: 'No data found' }] })
            });

            await expect(portfolioAction.handler(
                mockRuntime,
                mockMessage,
                {},
                {},
                mockCallback
            )).rejects.toThrow('Failed to fetch data from Zapper API');
        });

        it('should extract addresses from message using generateText', async () => {
            await portfolioAction.handler(
                mockRuntime,
                mockMessage,
                {},
                {},
                mockCallback
            );

            expect(vi.mocked(global.fetch)).toHaveBeenCalledWith(
                'https://public.zapper.xyz/graphql',
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('"addresses":["0x123","0x456"]')
                })
            );
        });
    });
});