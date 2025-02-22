import type { IAgentRuntime } from "@elizaos/core";
import { z } from "zod";

export const zapperEnvironmentSchema = z.object({
    ZAPPER_API_KEY: z.string().min(1, "ZAPPER_API_KEY is required"),
});

export type ZapperConfig = z.infer<typeof zapperEnvironmentSchema>;

export async function validateZapperConfig(runtime: IAgentRuntime): Promise<ZapperConfig> {
    try {
        const config = {
            ZAPPER_API_KEY: runtime.getSetting("ZAPPER_API_KEY") || process.env.ZAPPER_API_KEY,
        };

        return zapperEnvironmentSchema.parse(config);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const errorMessage = error.errors.map((e) => e.message).join("\n");
            throw new Error(`Zapper Configuration Error:\n${errorMessage}`);
        }
        throw error;
    }
}