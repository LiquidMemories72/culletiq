import {DynamoDBClient} from '@aws-sdk/client-dynamodb';
import {DynamoDBDocumentClient,PutCommand,UpdateCommand} from '@aws-sdk/lib-dynamodb';
import {S3Client,PutObjectCommand} from '@aws-sdk/client-s3';
const db=DynamoDBDocumentClient.from(new DynamoDBClient({}));const s3=new S3Client({});
const headers={'access-control-allow-origin':'*','access-control-allow-methods':'POST,OPTIONS','access-control-allow-headers':'content-type','content-type':'application/json','cache-control':'no-store'};
const reply=(status,body)=>({statusCode:status,headers,body:JSON.stringify(body)});
const uuid=/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i;
const route=['clear','green','amber','review','accept','reject'];
const clean=v=>typeof v==='string'?v.slice(0,120):'';
export function makeHandler({database=db,objectStore=s3,table=process.env.TABLE_NAME,bucket=process.env.BUCKET_NAME}={}){return async function handler(event){
  if(event.requestContext?.http?.method==='OPTIONS')return reply(204,{});
  if(event.requestContext?.http?.method!=='POST')return reply(405,{error:'Method not allowed'});
  if((event.body||'').length>1100000)return reply(413,{error:'Payload too large'});
  let p;try{p=JSON.parse(event.body||'')}catch{return reply(400,{error:'Invalid JSON'})}
  if(!uuid.test(p.sessionId||'')||!uuid.test(p.id||'')||!Number.isFinite(Date.parse(p.createdAt||'')))return reply(400,{error:'Invalid record identifier'});
  const key={sessionId:p.sessionId,sortKey:`${p.createdAt}#${p.id}`};
  const path=event.rawPath||'';
  try{
    if(path.endsWith('/corrections')){
      if(!route.includes(p.correction))return reply(400,{error:'Invalid correction'});
      await database.send(new UpdateCommand({TableName:table,Key:key,UpdateExpression:'SET correction = :c, correctedAt = :t',ConditionExpression:'attribute_exists(sessionId)',ExpressionAttributeValues:{':c':p.correction,':t':new Date().toISOString()}}));
      return reply(200,{saved:true});
    }
    if(!path.endsWith('/inspections'))return reply(404,{error:'Unknown route'});
    if(!route.includes(p.decision)||!p.result||typeof p.result!=='object'||typeof p.image!=='string')return reply(400,{error:'Invalid inspection'});
    const match=/^data:image\/jpeg;base64,([a-zA-Z0-9+/=]+)$/.exec(p.image);
    if(!match)return reply(400,{error:'JPEG evidence required'});
    const bytes=Buffer.from(match[1],'base64');if(bytes.length>700000||bytes.length<100||bytes[0]!==255||bytes[1]!==216||bytes[2]!==255)return reply(400,{error:'Invalid JPEG evidence'});
    const imageKey=`inspections/${p.sessionId}/${p.id}.jpg`;
    const shares={};for(const k of ['clear','green','amber','other','uncertain']){const n=p.result.shares?.[k];shares[k]=typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100?Math.round(n*100)/100:0}
    const reasons=Array.isArray(p.result.reasons)?p.result.reasons.slice(0,8).map(clean):[];
    await objectStore.send(new PutObjectCommand({Bucket:bucket,Key:imageKey,Body:bytes,ContentType:'image/jpeg',ServerSideEncryption:'AES256'}));
    await database.send(new PutCommand({TableName:table,Item:{...key,id:p.id,createdAt:p.createdAt,name:clean(p.name),source:clean(p.source),decision:p.decision,shares,reasons,imageKey,method:'browser-rgb-rules-v1',savedAt:new Date().toISOString(),expiresAt:Math.floor(Date.now()/1000)+30*86400},ConditionExpression:'attribute_not_exists(sessionId)'}));
    return reply(201,{saved:true,id:p.id,evidence:'private-s3',record:'dynamodb'});
  }catch(err){console.error('Storage operation failed',err.name);return reply(err.name==='ConditionalCheckFailedException'?409:503,{error:'AWS storage unavailable or record already exists'});}
}
}
export const handler=makeHandler();
