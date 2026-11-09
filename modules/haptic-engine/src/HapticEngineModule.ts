import { NativeModule, requireNativeModule } from "expo";

import { HapticEngineModuleEvents } from "./HapticEngine.types";

declare class HapticEngineModule extends NativeModule<HapticEngineModuleEvents> {
  PI: number;
  hello(): string;
  setValueAsync(value: string): Promise<void>;
}

export default requireNativeModule<HapticEngineModule>("HapticEngine");
