import React from "react";
import * as diff from "diff";

interface VersionDiffViewerProps {
  currentContent: string;
  historicalContent: string;
}

export function VersionDiffViewer({ currentContent, historicalContent }: VersionDiffViewerProps) {
  // We diff historical -> current. So "added" means it's in current but not historical.
  // Wait, the prompt says: "compare an old version with the current version".
  // Let's diff historicalContent vs currentContent.
  const diffParts = diff.diffLines(historicalContent, currentContent);

  return (
    <div className="font-mono text-sm bg-muted/30 border border-border rounded-md overflow-hidden h-[400px] flex flex-col">
      <div className="bg-muted px-4 py-2 text-xs font-semibold text-muted-foreground flex justify-between border-b border-border">
        <span>Historical Version</span>
        <span>Current Document</span>
      </div>
      <div className="overflow-y-auto p-4 flex-1">
        {diffParts.map((part, index) => {
          let bgColor = "bg-transparent";
          let textColor = "text-foreground";
          let prefix = "  ";

          if (part.added) {
            bgColor = "bg-green-500/10";
            textColor = "text-green-600 dark:text-green-400";
            prefix = "+ ";
          } else if (part.removed) {
            bgColor = "bg-red-500/10";
            textColor = "text-red-600 dark:text-red-400";
            prefix = "- ";
          }

          return (
            <div key={index} className={`whitespace-pre-wrap ${bgColor} ${textColor}`}>
              {part.value.split('\n').map((line, i, arr) => {
                // don't render empty trailing split if it's the last element
                if (i === arr.length - 1 && line === "") return null;
                return (
                  <div key={i} className="flex">
                    <span className="select-none opacity-50 mr-4 inline-block w-4 text-right">{prefix}</span>
                    <span className="flex-1 break-all">{line}</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
