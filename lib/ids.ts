/**
 * Id de uma edição dentro de uma série. O progresso salvo depende dele:
 * nunca mude o formato sem escrever uma migração.
 *
 * Vive em módulo próprio porque `data/*.ts` e `lib/guides.ts` precisam dele,
 * e um import de valor entre os dois fecharia um ciclo.
 */
export function subIssueId(parentId: string, n: number): string {
  return `${parentId}--${n}`;
}
