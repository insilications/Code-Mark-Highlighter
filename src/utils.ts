import * as vscode from "vscode";

export function getFuzzyThreshold(): number {
  return vscode.workspace.getConfiguration("codemark").get<number>("fuzzyMatchThreshold", 0.75);
}
