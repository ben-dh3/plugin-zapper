import { describe, it, expect, vi } from 'vitest';
import { farcasterPortfolioAction } from '../../actions/farcasterPortfolio/farcasterPortfolio';

describe('Farcaster Action', () => {
    describe('validate', () => {
        it('should handle message validation', async () => {
            const mockMessage = {
                content: {
                    text: 'Check portfolio for @vitalik'
                },
                metadata: {
                    username: 'vitalik'
                }
            };

            // Basic test to ensure message structure
            expect(mockMessage.content).toBeDefined();
            expect(mockMessage.content.text).toContain('@vitalik');
            expect(mockMessage.metadata).toBeDefined();
            expect(mockMessage.metadata.username).toBe('vitalik');
        });

        it('should validate successfully with the action validator', async () => {
            const mockRuntime = {
                messageManager: {
                    createMemory: vi.fn()
                }
            };

            const mockMessage = {
                content: {
                    text: 'Check portfolio for @vitalik'
                }
            };

            const result = await farcasterPortfolioAction.validate(mockRuntime, mockMessage);
            expect(result).toBe(true);
        });
    });

    describe('action properties', () => {
        it('should have correct action properties', () => {
            expect(farcasterPortfolioAction.name).toBe('FARCASTER_PORTFOLIO');
            expect(farcasterPortfolioAction.description).toBeDefined();
            expect(Array.isArray(farcasterPortfolioAction.similes)).toBe(true);
            expect(farcasterPortfolioAction.similes).toContain('GET_FARCASTER_PORTFOLIO');
            expect(Array.isArray(farcasterPortfolioAction.examples)).toBe(true);
        });
    });
});