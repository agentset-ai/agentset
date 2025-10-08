import type { EmbeddingModelV2 } from "@ai-sdk/provider";
import { VoyageEmbeddingOptions } from "voyage-ai-provider";

export class WrapEmbeddingModel<VALUE> implements EmbeddingModelV2<VALUE> {
  readonly specificationVersion = "v2";

  get modelId() {
    return this.baseModel.modelId;
  }

  get provider() {
    return this.baseModel.provider;
  }

  get maxEmbeddingsPerCall() {
    return this.baseModel.maxEmbeddingsPerCall;
  }

  get supportsParallelCalls() {
    return this.baseModel.supportsParallelCalls;
  }

  constructor(
    private readonly baseModel: EmbeddingModelV2<VALUE>,
    private readonly type: "document" | "query",
  ) {}

  private getEmbeddingProviderOptions = () => {
    return {
      ...(this.baseModel.provider === "voyage.embedding" && {
        voyage: {
          inputType: this.type,
        } satisfies VoyageEmbeddingOptions,
      }),
    };
  };

  doEmbed(
    options: Parameters<EmbeddingModelV2<VALUE>["doEmbed"]>[0],
  ): ReturnType<EmbeddingModelV2<VALUE>["doEmbed"]> {
    options.providerOptions = {
      ...options.providerOptions,
      ...this.getEmbeddingProviderOptions(),
    };
    return this.baseModel.doEmbed(options);
  }
}
