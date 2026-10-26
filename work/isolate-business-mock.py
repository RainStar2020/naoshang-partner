from pathlib import Path
p=Path('src/services/business-operations.js');s=p.read_text(encoding='utf-8-sig')
parser=s[s.index('export function parseAmount('):s.index('\nfunction quoteEndpoint')]
format_file=Path('src/features/business/format.js');f=format_file.read_text(encoding='utf8');f+='\n'+parser.replace('export function parseAmount','export function parseBusinessAmount')+'\n';format_file.write_text(f,encoding='utf8')
segments=[]
markers=[('export function getBusinessOperationOptions','export function previewBusinessOperation','mockOperationOptions','kind,account,context,entryId'),('export function previewBusinessOperation','function validateQuote','mockOperationPreview','kind,account,context,input,entryId,payload'),('export function commitBusinessOperation',None,'mockOperationCommit','kind,account,context,quoteId,idempotencyKey,entryId')]
# Rewrite from the end so earlier offsets remain valid.
for current,next_marker,name,args in reversed(markers):
 begin=s.index(current);limit=s.index(next_marker,begin) if next_marker else len(s)
 start=s.index('    const state=mockBusinessState',begin)
 end=s.rfind('\n  })\n}',start,limit)
 if end<start:raise RuntimeError('Extraction failed '+name)
 body=s[start:end]
 segments.append(f'export function {name}({args}) {{\n'+body+'\n}\n')
 s=s[:start]+f'    return {name}({args})'+s[end:]
s=s.replace("import {mockBusinessState,mockClone} from './mock/business'", "import {mockOperationOptions,mockOperationPreview,mockOperationCommit} from './mock/business-operations'\nimport {parseBusinessAmount} from '../features/business/format'")
s=s.replace("const enumField=(key,label,options)=>({key,label,type:'enum',options})\n",'')
s=s.replace(parser,'export const parseAmount=parseBusinessAmount')
p.write_text(s,encoding='utf8')
header="import {mockBusinessState,mockClone} from './business'\nimport {parseBusinessAmount as parseAmount} from '../../features/business/format'\nconst enumField=(key,label,options)=>({key,label,type:'enum',options})\n// Explicit local test fixtures and transactions; never used when useMock is false.\n"
Path('src/services/mock/business-operations.js').write_text(header+'\n'.join(reversed(segments)),encoding='utf8')
