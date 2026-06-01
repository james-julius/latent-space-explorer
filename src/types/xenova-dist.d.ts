// The package's default entry (./src) crashes under Turbopack, so we import the
// prebuilt dist bundle directly. It has no types of its own — declare what we use.
declare module '@xenova/transformers/dist/transformers.js' {
  interface ProgressInfo { progress?: number; status?: string; file?: string }
  interface PipelineOptions {
    progress_callback?: (info: ProgressInfo) => void
  }
  type FeatureExtractor = (
    text: string,
    opts: { pooling: 'mean'; normalize: boolean },
  ) => Promise<{ data: Float32Array }>

  export function pipeline(
    task: 'feature-extraction',
    model: string,
    options?: PipelineOptions,
  ): Promise<FeatureExtractor>

  export const env: {
    allowLocalModels: boolean
    useBrowserCache: boolean
    [key: string]: unknown
  }
}
