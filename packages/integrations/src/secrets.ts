import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
import {DomainError} from '../../domain/src/errors';
/** Server-only implementation: browser boundary checker forbids importing this package. */
export class SecretVault {
 private readonly keys=new Map<number,Buffer>();
 constructor(keys:Readonly<Record<number,string>>,private readonly activeVersion:number){
  for(const [version,key] of Object.entries(keys)){const value=Buffer.from(key,'base64');if(!Number.isSafeInteger(Number(version))||Number(version)<1||value.length!==32||value.toString('base64')!==key)throw new DomainError('invalid_secret');this.keys.set(Number(version),value);}
  if(!this.keys.has(activeVersion))throw new DomainError('invalid_secret');
 }
 seal(token:string,context:string):string{
  if(!token||!context)throw new DomainError('invalid_secret');
  const iv=randomBytes(12);const cipher=createCipheriv('aes-256-gcm',this.keys.get(this.activeVersion)!,iv);
  cipher.setAAD(Buffer.from(JSON.stringify([1,this.activeVersion,context])));
  const ciphertext=Buffer.concat([cipher.update(token,'utf8'),cipher.final()]);
  return JSON.stringify({v:1,kid:this.activeVersion,iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),data:ciphertext.toString('base64')});
 }
 open(envelope:string,context:string):string{
  try{
   const parsed:unknown=JSON.parse(envelope);
   if(!parsed||typeof parsed!=='object')throw new Error();
   const value=parsed as Record<string,unknown>;
   if(Object.keys(value).sort().join(',')!=='data,iv,kid,tag,v'||value.v!==1||typeof value.kid!=='number'||typeof value.iv!=='string'||typeof value.tag!=='string'||typeof value.data!=='string'||!context)throw new Error();
   const key=this.keys.get(value.kid);if(!key)throw new Error();
   const decode=(s:string)=>{const b=Buffer.from(s,'base64');if(b.toString('base64')!==s)throw new Error();return b;};
   const iv=decode(value.iv),tag=decode(value.tag);if(iv.length!==12||tag.length!==16)throw new Error();
   const cipher=createDecipheriv('aes-256-gcm',key,iv);cipher.setAAD(Buffer.from(JSON.stringify([1,value.kid,context])));cipher.setAuthTag(tag);
   return Buffer.concat([cipher.update(decode(value.data)),cipher.final()]).toString('utf8');
  }catch{throw new DomainError('invalid_secret');}
 }
}
