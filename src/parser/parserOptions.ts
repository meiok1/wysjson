import * as babelParser from "@babel/parser";

export function getCommonBabelParserPlugins(): babelParser.ParserPlugin[] {
  return [
    "jsx",
    "typescript",
    "classProperties",
    "classPrivateProperties",
    "classPrivateMethods",
    "decorators-legacy",
    "objectRestSpread",
    "optionalChaining",
    "nullishCoalescingOperator",
    "bigInt",
    "topLevelAwait",
    "importAttributes",
  ];
}

export function getCommonParseOptions(
  extraOptions: Record<string, unknown> = {},
) {
  return {
    sourceType: "module" as const,
    allowImportExportEverywhere: true,
    plugins: getCommonBabelParserPlugins(),
    ...extraOptions,
  };
}

export function getCommonExpressionParseOptions(
  extraOptions: Record<string, unknown> = {},
) {
  return getCommonParseOptions(extraOptions);
}
