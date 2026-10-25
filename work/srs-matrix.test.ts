import { kickCandidates } from "./engine.ts";

const transitions: Array<[0|1|2|3,0|1|2|3]> = [[0,1],[1,0],[1,2],[2,1],[2,3],[3,2],[3,0],[0,3]];
for (const piece of ["J","L","S","T","Z"] as const) {
  for (const [from,to] of transitions) {
    if (kickCandidates(piece, from, to).length !== 5) throw new Error(piece + " SRS table incomplete");
  }
}
for (const [from,to] of transitions) {
  if (kickCandidates("I", from, to).length !== 5) throw new Error("I SRS table incomplete");
}
for (const [from,to] of [[0,1],[1,2],[2,3],[3,0]] as const) {
  if (kickCandidates("O", from, to).length !== 1) throw new Error("O SRS table incomplete");
}
console.log("srs matrix: ok");
