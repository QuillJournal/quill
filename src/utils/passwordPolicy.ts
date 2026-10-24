import { zxcvbn, zxcvbnOptions } from "@zxcvbn-ts/core";
import * as zxcvbnCommonPackage from "@zxcvbn-ts/language-common";
import * as zxcvbnEnPackage from "@zxcvbn-ts/language-en";

export const MIN_PASSWORD_LENGTH = 12;
const MIN_SCORE = 3;

let configured = false;
function configure() {
  if (configured) return;
  zxcvbnOptions.setOptions({
    translations: zxcvbnCommonPackage.translations,
    graphs: zxcvbnCommonPackage.adjacencyGraphs,
    dictionary: {
      ...zxcvbnCommonPackage.dictionary,
      ...zxcvbnEnPackage.dictionary,
    },
  });
  configured = true;
}

export type PasswordCheck = { ok: boolean; message?: string };

export function validatePassword(
  password: string,
  userInputs: string[] = [],
): PasswordCheck {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      message: `Use at least ${MIN_PASSWORD_LENGTH} characters. A few random words strung together works great.`,
    };
  }
  configure();
  const result = zxcvbn(
    password.slice(0, 128),
    userInputs.map((s) => s.trim()).filter(Boolean),
  );
  if (result.score < MIN_SCORE) {
    const tip = result.feedback.warning || result.feedback.suggestions[0];
    return {
      ok: false,
      message: `That password is too easy to guess${tip ? `: ${tip}` : "."} Try a longer passphrase of unrelated words.`,
    };
  }
  return { ok: true };
}
