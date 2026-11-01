import * as SecureStore from "expo-secure-store";

const INDEX_KEY = "quill.tracked_keys";

let queue: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
}

async function readIndex(): Promise<string[]> {
  try {
    const raw = await SecureStore.getItemAsync(INDEX_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((k): k is string => typeof k === "string")
      : [];
  } catch {
    return [];
  }
}

async function writeIndex(keys: string[]): Promise<void> {
  await SecureStore.setItemAsync(INDEX_KEY, JSON.stringify(keys));
}

export function setTrackedItem(key: string, value: string): Promise<void> {
  return serial(async () => {
    const index = await readIndex();
    if (!index.includes(key)) await writeIndex([...index, key]);
    await SecureStore.setItemAsync(key, value);
  });
}

export function clearTrackedItems(prefix = ""): Promise<void> {
  return serial(async () => {
    const index = await readIndex();
    const doomed = index.filter((k) => k.startsWith(prefix));
    await Promise.all(doomed.map((k) => SecureStore.deleteItemAsync(k)));
    await writeIndex(index.filter((k) => !k.startsWith(prefix)));
  });
}
