// One-time idempotent source migration. Review-branch code only, no database.
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const changed=[];
function rewrite(file){
 const input=fs.readFileSync(file,'utf8'),source=ts.createSourceFile(file,input,ts.ScriptTarget.Latest,true),edits=[];
 const edit=(start,end,text)=>edits.push({start,end,text});
 if(/(?:page|layout|route)\.tsx?$/.test(file))for(const fn of source.statements.filter(ts.isFunctionDeclaration)){
  if(!fn.body)continue;const declarations=[];
  for(const p of fn.parameters){
   if(!ts.isObjectBindingPattern(p.name))continue;
   for(const b of p.name.elements){
    const prop=(b.propertyName||b.name).getText(source);
    if(!['params','searchParams'].includes(prop)||!ts.isIdentifier(b.name)||b.name.text!==prop)continue;
    if(!p.type||!ts.isTypeLiteralNode(p.type))throw Error('Review non-inline route props in '+file);
    const member=p.type.members.find(m=>m.name?.getText(source)===prop);
    if(!member?.type)throw Error('Missing route prop type in '+file);
    if(member.type.getText(source).startsWith('Promise<'))continue;
    edit(member.type.getStart(source),member.type.end,`Promise<${member.type.getText(source)}>`);
    edit(b.getStart(source),b.end,`${prop}: ${prop}Promise`);
    declarations.push(`const ${prop} = await ${prop}Promise;`);
   }
  }
  if(declarations.length){
   if(/^\s*['"]use client['"]/.test(input))throw Error('Review client route manually: '+file);
   if(!fn.modifiers?.some(m=>m.kind===ts.SyntaxKind.AsyncKeyword)){
    const keyword=fn.getChildren(source).find(n=>n.kind===ts.SyntaxKind.FunctionKeyword);edit(keyword.getStart(source),keyword.getStart(source),'async ');
   }
   edit(fn.body.getStart(source)+1,fn.body.getStart(source)+1,'\n  '+declarations.join('\n  ')+'\n');
  }
 }
 const imports=source.statements.filter(ts.isImportDeclaration).filter(n=>n.moduleSpecifier.text==='next/headers').flatMap(n=>n.importClause?.namedBindings?.elements||[]).map(n=>n.name.text);
 function visit(n){
  if(ts.isCallExpression(n)&&ts.isIdentifier(n.expression)&&imports.includes(n.expression.text)&&['cookies','headers','draftMode'].includes(n.expression.text)&&!ts.isAwaitExpression(n.parent))edit(n.getStart(source),n.end,`(await ${n.getText(source)})`);
  ts.forEachChild(n,visit);
 }
 visit(source);if(!edits.length)return;let result=input;
 for(const e of edits.sort((a,b)=>b.start-a.start))result=result.slice(0,e.start)+e.text+result.slice(e.end);
 fs.writeFileSync(file,result);changed.push(file);
}
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory())walk(f);else if(/\.tsx?$/.test(e.name))rewrite(f);}}
walk('app');walk('lib');
const middleware='middleware.ts';let m=fs.readFileSync(middleware,'utf8');
if(!m.includes('Strip untrusted tenant')){
 m=m.replaceAll('const requestHeaders = new Headers(req.headers);','const requestHeaders = new Headers(req.headers);\n    // Strip untrusted tenant hints before applying our own host routing.\n    requestHeaders.delete("x-tenant-slug");\n    requestHeaders.delete("x-tenant-domain");');
 m=m.replace('return NextResponse.next();','const requestHeaders = new Headers(req.headers);\n    requestHeaders.delete("x-tenant-slug");\n    requestHeaders.delete("x-tenant-domain");\n    return NextResponse.next({request:{headers:requestHeaders}});');
 fs.writeFileSync(middleware,m);changed.push(middleware);
}
console.log('Migrated files:',changed.length,changed);
