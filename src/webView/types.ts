import type { jumpToHighlight } from "../highlightNavigator";

type JumpParamsTuple = Parameters<typeof jumpToHighlight>;

export interface IJumpToHighlightParams {
  filePath: JumpParamsTuple[0];
  snippet: JumpParamsTuple[1];
  codeHash: JumpParamsTuple[2];
  fuzzyThreshold: JumpParamsTuple[3];
  jumpInSplitEditor: JumpParamsTuple[4];
}

// export type onActionData = ({ id: "jumpTo" } & IJumpToHighlightParams) | { id: "refresh" };
// // | { id: "editTag"; highlightId: string; newTag: string };
// // | { id: "changeColor"; highlightId: string; newColor: string };

// export type jumpToHighlightTypeParams = IJumpToHighlightParams;
